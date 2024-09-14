const express = require('express');
const axios = require('axios').default;
const mysql = require('mysql');

const app = express();
const PORT = 3000;

const dbConfig = {
  host: 'db',
  user: 'root',
  password: '12345',
  database: 'appdb',
};

app.use(express.json()); // Para parsear JSON no corpo da requisição
app.use(express.static('public')); // Serve arquivos estáticos, se houver

app.get('/', async (_req, res) => {
    await InsertPeople(res);
});

app.post('/insert-person', (req, res) => {
    const { name } = req.body;

    if (!name) {
        return res.status(400).send('Nome é obrigatório');
    }

    const connection = mysql.createConnection(dbConfig);

    const queryPromise = (query, values) => {
        return new Promise((resolve, reject) => {
            connection.query(query, values, (error, results) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(results);
                }
            });
        });
    };

    const INSERT = 'INSERT INTO people (name) VALUES (?)';
    queryPromise(INSERT, [name])
        .then(results => {
            const newPerson = { id: results.insertId, name };
            connection.end();
            res.json(newPerson);
        })
        .catch(error => {
            connection.end();
            res.status(500).send(`Erro: ${error.message}`);
        });
});

async function InsertPeople(res) {
    try {
        const namePeople = await getNamePeople();
        if (!namePeople) {
            throw new Error('Nome da pessoa não encontrado');
        }

        const connection = mysql.createConnection(dbConfig);
        const queryPromise = (query, values) => {
            return new Promise((resolve, reject) => {
                connection.query(query, values, (error, results) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(results);
                    }
                });
            });
        };

        const INSERT = 'INSERT INTO people (name) VALUES (?)';
        await queryPromise(INSERT, [namePeople]);
        console.log(`${namePeople} inserido com sucesso no banco`);

        await getAllPeople(res, connection);

        connection.end();
    } catch (error) {
        console.error('Erro ao inserir o nome:', error);
        res.status(500).send(`Erro: ${error.message}`);
    }
}

async function getNamePeople() {
    const RANDOM = Math.floor(Math.random() * 100);
    try {
        const response = await axios.get('https://pokeapi.co/api/v2/pokemon?limit=100');
        return response.data.results[RANDOM].name;
    } catch (error) {
        console.error('Erro ao buscar dados:', error);
        return 'Sem nome Definido';
    }
}

async function getAllPeople(res, connection) {
    const SELECT = 'SELECT id, name FROM people';

    try {
        const results = await queryPromise(connection, SELECT);

        const tableRows = results.map(person => `
            <tr>
                <td>${person.id}</td>
                <td>${person.name}</td>
            </tr>
        `).join('');
        
        const table = `
            <table border="1" cellspacing="0" cellpadding="5">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Name</th>
                    </tr>
                </thead>
                <tbody id="peopleTableBody">${tableRows}</tbody>
            </table>
        `;
        
        res.send(`
            <h1>Full Cycle Rocks!</h1>
            ${table}
            <h2>Adicionar Nova Pessoa</h2>
            <input type="text" id="name" placeholder="Nome" required>
            <button id="addPersonButton">Adicionar</button>
        
            <script>
                document.getElementById('addPersonButton').addEventListener('click', async () => {
                    const name = document.getElementById('name').value;
                    if (!name) {
                        alert('Por favor, insira um nome.');
                        return;
                    }
        
                    try {
                        const response = await fetch('/insert-person', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ name })
                        });
        
                        if (response.ok) {
                            const data = await response.json();
                            const tableBody = document.getElementById('peopleTableBody');
                            const newRow = document.createElement('tr');
                            newRow.innerHTML = \`
                                <td>\${data.id}</td>
                                <td>\${data.name}</td>
                            \`;
                            tableBody.appendChild(newRow);
                            document.getElementById('name').value = ''; // Limpar o campo de entrada
                        } else {
                            const error = await response.text();
                            alert('Erro: ' + error);
                        }
                    } catch (error) {
                        alert('Erro ao adicionar pessoa: ' + error.message);
                    }
                });
            </script>
        `);
    } catch (error) {
        console.error('Erro ao buscar os nomes:', error);
        res.status(500).send(`Erro: ${error.message}`);
    }
}

function queryPromise(connection, query, values) {
    return new Promise((resolve, reject) => {
        connection.query(query, values, (error, results) => {
            if (error) {
                reject(error);
            } else {
                resolve(results);
            }
        });
    });
}

app.listen(PORT, () => {
    console.log(`Aplicação rodando na porta: ${PORT}`);
});
