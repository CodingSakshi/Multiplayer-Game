const socket = io();
let pName;
let isMyTurn = false;  // Track if it's the player's turn

/* Handling enter name section */

function closeOverlays() {
    document.getElementById('backdrop').style.display = 'none';
    document.getElementById('edit-name-section').style.display = 'none';
    document.getElementById('invite-friend-section').style.display = 'none';
    document.getElementById('join-game-section').style.display = 'none';
}

document.getElementById('edit-name-btn').addEventListener('click', () => {
    document.getElementById('backdrop').style.display = 'block';
    document.getElementById('edit-name-section').style.display = 'block';
});

document.getElementById('cancel-button').addEventListener('click', closeOverlays);

document.getElementById('confirm-button').addEventListener('click', () => {
    document.getElementById('player-name').textContent = document.getElementById('input-player-name').value;
    pName = document.getElementById('player-name').textContent;   // also storing name in a var.
    closeOverlays();
});

/* Handling playing using code logic */

/* Handling invite game logic */
document.getElementById('invite-friend-btn').addEventListener('click', () => {
    if (document.getElementById('player-name').textContent) {
        document.getElementById('backdrop').style.display = 'block';
        document.getElementById('invite-friend-section').style.display = 'block';
        const code = String(Math.floor(100000 + Math.random() * 900000));
        document.getElementById('generated-code').textContent = code;
        
        socket.emit('generate code', pName, code);
    } else {
        alert('Enter your name to play!');
    }
});

document.getElementById('copy-code-button').addEventListener('click', ()=> {
    navigator.clipboard.writeText(document.getElementById('generated-code').textContent);
    document.getElementById('copy-code-button').textContent = 'Code Copied';
});

/* Handling join game logic */
document.getElementById('join-game-btn').addEventListener('click', ()=> {
    if (document.getElementById('player-name').textContent) {
        document.getElementById('backdrop').style.display = 'block';
        document.getElementById('join-game-section').style.display = 'block';
    } else {
        alert('Enter your name to play!');
    } 
});

document.getElementById('validate-code-btn').addEventListener('click', () => {
    const reqCode = String(document.getElementById('input-code').value);
    const playerName = document.getElementById('player-name').textContent;  // Assuming player name is still stored here

    socket.emit('validate code', playerName, reqCode, (success) => {
        if(success) {}
        else {
            alert('Failed to connect. Invalid or expired code.');
        }
    });
});


/* Handling Play with anonymous player section */

document.getElementById('anonymous-btn').addEventListener('click', () => {
    if (document.getElementById('player-name').textContent) {
        socket.emit('search', { name: pName });
        document.getElementById('anonymous-btn').disabled = true;
        document.getElementById('anonymous-btn').textContent = 'Searching...';
    } else {
        alert('Enter your name to play!');
    }
});

socket.on('display', (e) => {
    const pair = e.pair;

    closeOverlays();
    document.getElementById('nav-btns').style.display = 'none';
    document.getElementById('player-info').style.display = 'block';
    document.getElementById('game').style.display = 'block';
    

    if (pair.p1.p1Name === pName) {
        document.getElementById('player2').textContent = pair.p2.p2Name;
        document.getElementById('value2').textContent = 'O';
        document.getElementById('player1').textContent = pair.p1.p1Name;
        document.getElementById('value1').textContent = 'X';
        isMyTurn = true; // Player 1 starts
    } else {
        document.getElementById('player2').textContent = pair.p1.p1Name;
        document.getElementById('value2').textContent = 'X';
        document.getElementById('player1').textContent = pair.p2.p2Name;
        document.getElementById('value1').textContent = 'O';
        isMyTurn = false; // Player 2 waits
    }

    document.getElementById('whose-turn').textContent =  "X's";
});

/* Handling playing logic */

document.querySelectorAll('#blocks li').forEach((e, index) => {
    e.addEventListener('click', () => {
        if (isMyTurn && e.textContent === '') {
            e.textContent = document.getElementById('value1').textContent;
            socket.emit('playing', { index: index, pName: pName });
            isMyTurn = false;
            document.getElementById('whose-turn').textContent = "X's";
        }
    });
});

socket.on('playing', (e) => {
    const pair = e.pair;
    document.querySelectorAll('#blocks li').forEach((block, index) => {
        block.textContent = pair.board[index];
        if (pair.board[index] !== '') block.style.backgroundColor = 'rgb(50, 49, 49)';
        else block.style.backgroundColor = '';
    });

    const turn = pair.sum % 2 === 0 ? "O's" : "X's";
    document.getElementById('whose-turn').textContent = `${turn}`;

    isMyTurn = (turn === document.getElementById('value1').textContent + "'s");   // Update turn state
});

socket.on('winner', (e) => {
    const winner = e.winner;
    document.getElementById('backdrop').style.display = 'block';

    if (winner === document.getElementById('value1').textContent) {
        document.getElementById('winner-overlay').style.display = 'flex';
        document.getElementById('winner-name').textContent = player1.textContent;
    } else {
        document.getElementById('losor-overlay').style.display = 'block';
        document.getElementById('status').textContent = 'You lost,';
        document.getElementById('losor-name').textContent = player1.textContent;
    } 
});

socket.on('draw', () => {
    document.getElementById('backdrop').style.display = 'block';
    document.getElementById('losor-overlay').style.display = 'block';
    document.getElementById('status').textContent = "It's a";
    document.getElementById('losor-name').textContent = 'draw!';
});

document.querySelectorAll('.closeButton').forEach(btn => {
    btn.addEventListener('click', () => {
        location.reload();
    });
});

socket.on('opponentDisconnected', () => {
    alert('Your opponent has disconnected. The page will reload.');
    location.reload();
});

