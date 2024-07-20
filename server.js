const express = require('express');
const { createServer } = require('http');
const { join } = require('path');
const { Server } = require('socket.io');

const app = express();
const server = createServer(app);
const io = new Server(server);

app.use(express.static('public'));
app.use(express.urlencoded({ extended: false }));

app.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'index.html'));
});

let pairedPlayers = [];
let unpairedPlayers = [];
let codeRequests = [];

io.on('connection', (socket) => {
    console.log(`user connected with socket id ${socket.id}`);

    socket.on('generate code', (pName, code) => {
        console.log('generated code is' + code);
        codeRequests.push({ name: pName, id: socket.id, code: code}); 
    });

    socket.on('validate code', (playerName, reqCode, callback) => {
        console.log('validating code is' + reqCode);
        let obj = codeRequests.find(req => req.code === reqCode);
        // console.log(obj.code);
        if(obj) {
            console.log(obj.code);
            console.log('matched');
            let player1 = {
                p1Name: obj.name,
                p1Id: obj.id,
                p1Value: 'X',
                p1Move: ''
            }
            let player2 = {
                p2Name: playerName,
                p2Id: socket.id,
                p2Value: 'O',
                p2Move: ''
            };
            let pair = {
                p1: player1,
                p2: player2,
                board: Array(9).fill(''),
                sum: 1
            };
            pairedPlayers.push(pair);
            let index = codeRequests.findIndex(req => req.code === reqCode);
            if (index !== -1) {
                codeRequests.splice(index, 1);
            }
            io.to(player1.p1Id).emit('display', { pair });
            io.to(player2.p2Id).emit('display', { pair });
        }
        else {
            console.log('unmatched');
            callback(false);
        }
    });
    
    socket.on('search', (e) => {
        unpairedPlayers.push({ name: e.name, id: socket.id });
        if (unpairedPlayers.length >= 2) {
            let player1 = {
                p1Name: unpairedPlayers[0].name,
                p1Id: unpairedPlayers[0].id,
                p1Value: 'X',
                p1Move: ''
            };
            let player2 = {
                p2Name: unpairedPlayers[1].name,
                p2Id: unpairedPlayers[1].id,
                p2Value: 'O',
                p2Move: ''
            };
            let pair = {
                p1: player1,
                p2: player2,
                board: Array(9).fill(''),
                sum: 1
            };
            pairedPlayers.push(pair);
            unpairedPlayers.splice(0, 2);
            // Notify only the paired players
            io.to(player1.p1Id).emit('display', { pair });
            io.to(player2.p2Id).emit('display', { pair });
        }
    });

    socket.on('playing', (e) => {
        let pair = pairedPlayers.find(pair => pair.p1.p1Id === socket.id || pair.p2.p2Id === socket.id);
        if (!pair) return;

        let currentPlayer = pair.p1.p1Id === socket.id ? pair.p1 : pair.p2;
        let opponentPlayer = pair.p1.p1Id === socket.id ? pair.p2 : pair.p1;

        if (pair.board[e.index] === '') {
            pair.board[e.index] = currentPlayer.p1Value || currentPlayer.p2Value;
            pair.sum++;
            io.to(pair.p1.p1Id).emit('playing', { pair });
            io.to(pair.p2.p2Id).emit('playing', { pair });

            let winner = checkWinner(pair.board);
            if (winner) {
                io.to(pair.p1.p1Id).emit('winner', { winner: winner });
                io.to(pair.p2.p2Id).emit('winner', { winner: winner });
            } else if (pair.sum > 9) {
                io.to(pair.p1.p1Id).emit('draw');
                io.to(pair.p2.p2Id).emit('draw');
            }
        }
    });

    socket.on('disconnect', () => {
        console.log(`user disconnected with socket id ${socket.id}`);
        
        let pairIndex = pairedPlayers.findIndex(pair => pair.p1.p1Id === socket.id || pair.p2.p2Id === socket.id);
        
        if (pairIndex !== -1) {
            let pair = pairedPlayers[pairIndex];
            let remainingPlayerId = pair.p1.p1Id === socket.id ? pair.p2.p2Id : pair.p1.p1Id;
            
            io.to(remainingPlayerId).emit('opponentDisconnected');
            
            pairedPlayers.splice(pairIndex, 1);
        } else {
            unpairedPlayers = unpairedPlayers.filter(player => player.id !== socket.id);
        }
    });
    
});

function checkWinner(board) {
    const winPatterns = [
        [0, 1, 2],
        [3, 4, 5],
        [6, 7, 8],
        [0, 3, 6],
        [1, 4, 7],
        [2, 5, 8],
        [0, 4, 8],
        [2, 4, 6]
    ];

    for (const pattern of winPatterns) {
        const [a, b, c] = pattern;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return board[a];
        }
    }
    return null;
}

server.listen(3000, () => {
    console.log('port connected to 3000');
});
