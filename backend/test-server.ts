import * as http from 'http';
const server = http.createServer((req, res) => res.end('test'));
server.listen(3000, () => console.log('Listening on 3000'));
