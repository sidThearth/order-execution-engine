const { Client } = require('pg');

const client = new Client({
    host: '127.0.0.1',
    port: 5435,
    user: 'postgres',
    password: 'mysecretpassword',
    database: 'order_execution',
});

client.connect()
    .then(() => {
        console.log('Connected successfully!');
        return client.end();
    })
    .catch(err => {
        console.error('Connection error:', err);
        process.exit(1);
    });
