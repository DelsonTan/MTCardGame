$(document).ready(function () {
    // thisUser: username as a String
    // gameID: game ID as a string

    // Canvas dimensions
    var canvas = document.getElementById("Goofspiel");
    canvas.width = 1600;
    canvas.height = 900;

    canvasTop = canvas.offsetTop;
    canvasLeft = canvas.offsetLeft;
    var ctx = canvas.getContext("2d");

    var colorThemePrimary = "#8B1E3F";
    var colorThemeSecondary = "#D9CAB3";
    var textColor = "#000000";

    ctx.fillStyle = colorThemePrimary;
    ctx.strokeStyle = colorThemeSecondary;

    class Card {
        // static cards = [];
        static getAllCards() {
            if (this._cards === undefined)
                this.initializeCards();
            return this._cards
        };

        static initializeCards() {
            var result = [];
            ['Spade', 'Heart', 'Club', 'Diamond'].forEach(mySuit => {
                ['Ace', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'Jack', 'Queen', 'King'].forEach((myName, index) => {
                    result.push(new Card(myName, mySuit, index + 1))
                })
            });
            this._cards = result;
        };
        static fromObjects(collection) { collection.map(each => this.allCards().find(e => e.name === each.name && e.suit === each.suit)) };
        static allCards() { return this._cards };
        static getSuit(aSuit) { return this.getAllCards().filter(each => each.suit === aSuit) };
        static getHearts() { return this.getSuit("Heart") };
        static getSpades() { return this.getSuit("Spade") };
        static getClubs() { return this.getSuit("Club") };
        static getDiamonds() { return this.getSuit("Diamond") };
        static getCardFor(name, suit) { return this.allCards().find(each => each.name === name && each.suit === suit) }
        isSameAs(card) { return (card.name === this.name && card.suit === this.suit) }
        constructor(name, suit, number) {
            this.name = name;
            this.suit = suit;
            this.value = number;
        };
    }

    // card specifications
    var cardNames = ["Ace", "2", "3", "4", "5", "6", "7", "8", "9", "10", "Jack", "Queen", "King"];
    var cardValues = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
    var playingCard = {
        width: 80,
        height: 120,
        backColor: colorThemePrimary,
        frontColor: colorThemeSecondary
    }

    var loaded;
    // properties extracted from gamestate
    var player1 = "Waiting ...";
    var player2 = "Waiting ...";
    var score1 = 0;
    var score2 = 0;
    var playerSuit = "Diamond";
    // turn histories
    var turnHistory = [];
    var myTurnHistory = [];
    var opponentTurnHistory = [];

    // stored as an array of cards
    var myHand = Card.getSuit(playerSuit);
    // stored as numbers for card rendering
    var theirHand = 13;
    var prizeDeck = 13;

    var myWinnings = Card.getHearts();
    var theirWinnings = Card.getHearts();

    // play area cards
    var prizeCard = {};
    var playerPlayed = {};
    var opponentPlayed = {};

    // card.top and card.left keys are for collision detection
    var playerHandCollision = [];
    var opponentHandCollision = [];

    // times for animated events
    var turnResolutionTime;
    var matchResolutionTime;

    // polling server for new gamestate
    function poll() {
        $.ajax({
            method: "GET",
            url: "/gs/" + (gameID).toString()
        }).done((gs) => {
            loaded = window.performance.now();
            console.log(gs);

            parseGameState(gs);
            turnResolve();
        })
    }

    var intervalID;

    function doPoll() {
        intervalID = setInterval(poll, 1000);
    }

    $("canvas").on('click', function (event) {
        var mouseX = event.pageX - canvasLeft;
        var mouseY = event.pageY - canvasTop;

        playerHandCollision.forEach(function (card) {

            if (// mouseclick collision detection
                ((mouseX > card.left && mouseX < card.left + playingCard.width)
                    && (mouseY > card.top && mouseY < card.top + playingCard.height))
                && // move validation, does not pass if move is illegal
                !playerPlayed) {
                var myData = {};
                myData.gameid = gameID;
                var cardData = {};
                cardData.name = card.name;
                cardData.suit = card.suit;
                myData.card = cardData;
                playerPlayed = cardData;
                $.ajax({
                    method: "POST",
                    url: "/gs/",
                    data: myData
                }).done(function () {
                    console.log(`Played card:, ${myData.card.name}, suit: ${myData.card.suit}`)
                })
            }
        })
    })

    // Renders the scoreboard
    function renderScoreBoard() {
        var width = 200;
        var height = 150; // recommend value divisible by 3
        var xpos = 20;
        var ypos = canvas.height / 2 - height / 2;
        // SCORE rectangle
        ctx.beginPath();
        ctx.rect(xpos, ypos - height / 3, width, height / 3);
        ctx.fillStyle = colorThemePrimary;
        ctx.fill();
        ctx.stroke();
        ctx.closePath();
        ctx.beginPath();
        ctx.font = "20px Arial";
        ctx.fillStyle = colorThemeSecondary;
        ctx.fillText("SCORE", xpos + width / 3, ypos - height / 7);
        ctx.closePath();
        // Player 1 name rectangle
        ctx.beginPath();
        ctx.rect(xpos, ypos, width / 3 * 2, height / 3);
        ctx.fillStyle = colorThemeSecondary;
        ctx.fill();
        ctx.stroke();
        ctx.closePath();
        ctx.beginPath();
        ctx.font = "20px Arial";
        ctx.fillStyle = textColor;
        ctx.fillText(player1, xpos + 10, ypos + 30);
        ctx.closePath();
        // Player 1 score rectangle
        ctx.beginPath();
        ctx.rect(xpos + width / 3 * 2, ypos, width / 3, height / 3);
        ctx.fillStyle = colorThemeSecondary;
        ctx.fill();
        ctx.stroke();
        ctx.closePath();
        ctx.beginPath();
        ctx.font = "20px Arial";
        ctx.fillStyle = textColor;
        ctx.fillText(score1, xpos + 5 * width / 6, ypos + 30);
        ctx.closePath();
        // Player 2 name rectangle
        ctx.beginPath();
        ctx.rect(xpos, ypos + height / 3, width / 3 * 2, height / 3);
        ctx.fillStyle = colorThemeSecondary;
        ctx.fill();
        ctx.stroke();
        ctx.closePath();
        ctx.beginPath();
        ctx.font = "20px Arial";
        ctx.fillStyle = textColor;
        ctx.fillText(player2, xpos + 10, ypos + height / 3 + 30);
        ctx.closePath();
        // Player 2 score rectangle
        ctx.beginPath();
        ctx.rect(xpos + width / 3 * 2, ypos + height / 3, width / 3, height / 3);
        ctx.fillStyle = colorThemeSecondary;
        ctx.fill();
        ctx.stroke();
        ctx.closePath();
        ctx.beginPath();
        ctx.font = "20px Arial";
        ctx.fillStyle = textColor;
        ctx.fillText(score2, xpos + 5 * width / 6, ypos + height / 3 + 30);
        ctx.closePath();
    }

    // Renders a card on canvas. Specify inner color and value if card is face up
    function renderPlayingCard(xpos, ypos, innerColor, name) {

        ctx.beginPath();
        ctx.rect(xpos, ypos, playingCard.width, playingCard.height);
        ctx.fillStyle = playingCard.backColor;
        ctx.fill();
        ctx.stroke();
        ctx.closePath();

        if (innerColor) {
            ctx.beginPath();
            ctx.rect(xpos + 10, ypos + 10, playingCard.width - 20, playingCard.height - 20);
            ctx.fillStyle = playingCard.frontColor;
            ctx.fill();
            ctx.stroke();
            ctx.closePath;

            ctx.beginPath();
            ctx.font = "16px Arial";
            ctx.fillStyle = textColor;
            ctx.fillText(name, xpos + 15, ypos + 25);
            ctx.closePath();

            ctx.beginPath();
            ctx.font = "16px Arial";
            ctx.fillStyle = textColor;
            ctx.fillText(name, xpos + playingCard.width - 25, ypos + playingCard.height - 15);
            ctx.closePath();
        }
    }

    // Accepts an array of cards representing player cards and renders them in a row
    function renderPlayerHand(myCards) {
        var offsetX = 20;
        if (myCards.length % 2 === 0) {
            var xpos = canvas.width / 2 - (myCards.length / 2 * (playingCard.width + offsetX)) + offsetX / 2;
        } else {
            var xpos = canvas.width / 2 - (myCards.length + 1) / 2 * playingCard.width + playingCard.width / 2 - offsetX * (myCards.length - 1) / 2;
        }
        var ypos = canvas.height - playingCard.height - 20;
        playerHandCollision = []
        for (var i = 0; i < cardNames.length; i++) {
            for (var j = 0; j < myCards.length; j++) {
                if (cardNames[i] === myCards[j].name) {
                    var cardObj = {};
                    cardObj.name = cardNames[i];
                    cardObj.initial = cardInitial(cardNames[i]);
                    cardObj.suit = myCards[j].suit;
                    cardObj.value = cardValues[i];
                    cardObj.left = xpos;
                    cardObj.top = ypos;
                    playerHandCollision.push(cardObj);
                    renderPlayingCard(cardObj.left, cardObj.top, playingCard.frontColor, cardObj.initial);
                    xpos = xpos + playingCard.width + offsetX;
                }
            }
        }
    }

    // Accepts a number and renders that number of cards face down in a row
    function renderOpponentHand(n) {
        var offsetX = 20;
        if (n % 2 === 0) {
            var xpos = canvas.width / 2 - (n / 2 * (playingCard.width + offsetX)) + offsetX / 2;
        } else {
            var xpos = canvas.width / 2 - (n + 1) / 2 * playingCard.width + playingCard.width / 2 - offsetX * (n - 1) / 2;
        }
        var ypos = 20;
        opponentHandCollision = [];
        for (var i = 0; i < n; i++) {
            var cardObj = {};
            cardObj.left = xpos;
            cardObj.top = ypos;
            opponentHandCollision.push(cardObj);
            renderPlayingCard(cardObj.left, cardObj.top);
            xpos = xpos + playingCard.width + offsetX;
        }
    }

    // TODO: accepts a number and renders that number of cards face down stacked up
    function renderPrizeDeck(n) {
        initialXPos = 20;
        var xpos = canvas.width / 2 + playingCard.width + initialXPos;
        var ypos = canvas.height / 2 - playingCard.height / 2;
        var offset = 2;
        var thisOffset = offset;
        for (var i = 0; i < n; i++) {
            renderPlayingCard(xpos - thisOffset, ypos - thisOffset);
            thisOffset = thisOffset + offset;
        }
    }

    // Accepts a card and renders it on the center of the screen
    function renderPrizeCard(card) {
        xpos = canvas.width / 2 - playingCard.width / 2;
        ypos = canvas.height / 2 - playingCard.height / 2;
        ctx.beginPath();
        ctx.rect(xpos - 20, ypos - 20, playingCard.width + 40, playingCard.height + 40);
        ctx.strokeStyle = colorThemeSecondary;
        ctx.stroke();
        ctx.closePath();
        if (card !== undefined && (card.name)) {
            var cardName = cardInitial(card.name);
            renderPlayingCard(xpos, ypos, playingCard.frontColor, cardName);
        }
    }

    // Accepts a card object and renders it to the left and offset down to a card on the center of the screen face up
    function renderPlayerPlayed(card) {
        var xpos = canvas.width / 3 - playingCard.width / 2;
        var ypos = canvas.height / 3 * 2 - playingCard.height / 2;
        ctx.beginPath();
        ctx.rect(xpos - 20, ypos - 20, playingCard.width + 40, playingCard.height + 40);
        ctx.strokeStyle = colorThemeSecondary;
        ctx.stroke();
        ctx.closePath();
        if (card !== undefined && (card.name)) {
            var cardName = cardInitial(card.name);
            renderPlayingCard(xpos, ypos, playingCard.frontColor, cardName);
        }
    }

    // Accepts a card object and renders it to the right and offset up to a card on the center of the screen face down
    function renderOpponentPlayed(card) {
        var xpos = canvas.width / 3 * 2 - playingCard.width / 2;
        var ypos = canvas.height / 3 - playingCard.height / 2;
        ctx.beginPath();
        ctx.rect(xpos - 20, ypos - 20, playingCard.width + 40, playingCard.height + 40);
        ctx.strokeStyle = colorThemeSecondary;
        ctx.stroke();
        ctx.closePath();
        if (card !== undefined && (card.name)) {
            var cardName = cardInitial(card.name);
            if (playerPlayed) {
                renderPlayingCard(xpos, ypos, playingCard.frontColor, cardName);
            } else {
                //play animation here
                renderPlayingCard(xpos, ypos);
            }
        }
    }

    // Accepts an array of card objects and render them to the right of the player face up
    function renderWinnings() {
        var myXpos = canvas.width / 3 - playingCard.width - 90;
        var myYpos = canvas.height / 3 * 2 - playingCard.height / 2;
        var theirXpos = canvas.width / 3 * 2 + playingCard.width + 30;
        var theirYpos = canvas.height / 3 - playingCard.height / 2;
        var offset = 0;
        var increment = 2;
        ctx.beginPath();
        ctx.font = "16px Arial";
        ctx.fillStyle = textColor;
        ctx.fillText("My winnings", myXpos - playingCard.width - 50, myYpos + playingCard.height / 2);
        ctx.closePath();
        myWinnings.forEach(function (card) {
            renderPlayingCard(myXpos - offset, myYpos - offset, playingCard.frontColor, cardInitial(card.name));
            offset = offset + increment;
        });
        offset = 0;
        ctx.beginPath();
        ctx.font = "16px Arial";
        ctx.fillStyle = textColor;
        ctx.fillText("Their winnings", theirXpos + playingCard.width + 50, theirYpos + playingCard.height / 2);
        ctx.closePath();
        theirWinnings.forEach(function (card) {
            renderPlayingCard(theirXpos - offset, theirYpos - offset, playingCard.frontColor, cardInitial(card.name));
            offset = offset + increment;
        });
    }

    function renderSpecialCondition(renderfn, eventStartTime, duration) {
        // Exit condition: no start time
        if (!eventStartTime) {
            return;
        }
        if (duration) {
            var timeStamp = window.performance.now();
            var eventEndTime = eventStartTime + duration;
            // Exit condition: event has ended
            if (timeStamp > eventEndTime) {
                return;
            }
        }
        renderfn();
        return eventStartTime;
    }

    function renderTurnResolution() {
        var xpos = canvas.width / 2;
        var ypos = canvas.height / 3 * 2;
        var boxWidth = 400;
        var boxHeight = 100;
        var winColor = "#0B5345";
        var loseColor = colorThemePrimary;
        var scoreIncrease = prizeCard.value;

        ctx.beginPath();
        ctx.rect(xpos - boxWidth / 2, ypos - boxHeight / 2, boxWidth, boxHeight);
        ctx.font = "32px Arial";
        ctx.strokeStyle = colorThemeSecondary;
        if (playerPlayed.value > opponentPlayed.value) {
            ctx.stroke();
            ctx.fillStyle = winColor;
            ctx.fill();
            ctx.closePath();
            ctx.beginPath();
            ctx.fillStyle = colorThemeSecondary;
            ctx.fillText(`You won ${scoreIncrease} points!`, xpos - boxWidth * 5 / 16, ypos + boxHeight / 10);
        } else if (playerPlayed.value < opponentPlayed.value) {
            ctx.stroke();
            ctx.fillStyle = loseColor;
            ctx.fill();
            ctx.closePath();
            ctx.beginPath();
            ctx.fillStyle = colorThemeSecondary;
            ctx.fillText(`Opponent won ${scoreIncrease} points.`, xpos - boxWidth * 2 / 5, ypos + boxHeight / 10);
        }
        ctx.closePath();
    }

    function renderMatchResolution() {
        var xpos = canvas.width / 2;
        var ypos = canvas.height / 2;
        var boxWidth = 500;
        var boxHeight = 200;
        console.log(playerNum, score1, score2);
        ctx.beginPath();
        ctx.rect(xpos - boxWidth / 2, ypos - boxHeight / 2, boxWidth, boxHeight);
        ctx.font = "48px Arial";
        ctx.strokeStyle = colorThemeSecondary;
        ctx.stroke();
        // Player won
        if (((playerNum === "player1") && (score1 > score2))
            || ((playerNum === "player2") && (score2 > score1))) {
            ctx.fillStyle = "#0B5345";
            ctx.fill();
            ctx.closePath;
            ctx.beginPath;
            ctx.fillStyle = colorThemeSecondary;
            ctx.fillText(`You won this match!`, xpos - boxWidth / 2 + 35, ypos + 10);
            ctx.closePath();
            // Player lost
        } else if (((score1 > score2) && (playerNum === "player2")) ||
            (score1 < score2) && (playerNum === "player1")) {
            ctx.fillStyle = colorThemePrimary;
            ctx.fill();
            ctx.closePath;
            ctx.beginPath;
            ctx.fillStyle = colorThemeSecondary;
            ctx.fillText(`You lost this match.`, xpos, ypos);
            ctx.closePath();
            // Draw
        } else {
            ctx.fillStyle = colorThemePrimary;
            ctx.fill();
            ctx.closePath;
            ctx.beginPath;
            ctx.fillStyle = colorThemeSecondary;
            ctx.fillText(`This match is a draw.`, xpos, ypos);
            ctx.closePath();
        }
    }

    function draw() {
        if (loaded) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            renderScoreBoard();
            renderPlayerHand(myHand);
            renderOpponentHand(theirHand);
            renderPrizeDeck(prizeDeck);
            renderWinnings();
            renderPrizeCard(prizeCard);
            renderPlayerPlayed(playerPlayed);
            renderOpponentPlayed(opponentPlayed);
            turnResolutionTime = renderSpecialCondition(renderTurnResolution, turnResolutionTime, 5000);
            matchResolutionTime = renderSpecialCondition(renderMatchResolution, matchResolutionTime);
        } else {
            ctx.beginPath();
            ctx.font = "120px Arial";
            ctx.fillStyle = colorThemeSecondary;
            ctx.fillText("Loading...", canvas.width / 3, canvas.height / 2);
            ctx.closePath();
            // draw stuff when not loaded
        }
        // animate cards moving to the winning side's winnings pile
        // CHECK IF PLAYER WON/LOST, change to state 6/7
        requestAnimationFrame(draw);
    }

    // Helper functions to extract game state information and save them into global variables
    function parseGameState(gameState) {
        player1 = gameState.player1 || "Waiting ...";
        player2 = gameState.player2 || "Waiting ...";
        turnHistory = gameState.turnHistory;
        prizeCard = turnHistory[turnHistory.length - 1].prizeCard;
        playerNum = playerAssignments(true);
        myTurnHistory = turnHistory.map(turn => turn[playerAssignments(true)]).filter(playedThisTurn => (playedThisTurn));
        opponentTurnHistory = turnHistory.map(turn => turn[playerAssignments(false)]).filter(playedThisTurn => (playedThisTurn));
        prizeDeckHistory = turnHistory.map(turn => turn['prizeCard']).filter(revealed => (revealed));
        myHand = myHand.filter(card => !myTurnHistory.find(played => card.isSameAs(played)));
        theirHand = 13 - opponentTurnHistory.length;
        prizeDeck = 13 - prizeDeckHistory.length;
        playerPlayed = turnHistory[turnHistory.length - 1][playerAssignments(true)];
        opponentPlayed = turnHistory[turnHistory.length - 1][playerAssignments(false)];
        console.log(opponentPlayed);
        calculateScore(turnHistory);
    }

    // Return string "player1" or "player2" for user if given true, for opponent if given false
    // Used to extract value from output key in a turn object
    function playerAssignments(boolean) {
        if (!thisUser) {
            return;
        }
        if (boolean) {
            if (thisUser === player1) {
                return "player1"
            } else {
                return "player2"
            }
        } else {
            if (thisUser === player2) {
                return "player1";
            } else {
                return "player2";
            }
        }
    }

    // Other helper functions
    function calculateScore(history) {
        score1 = 0;
        score2 = 0;
        history.forEach(function (turn) {
            if ((turn.prizeCard) && (turn.player1) && (turn.player2)) {
                if (turn.player1.value > turn.player2.value) {
                    score1 = score1 + turn.prizeCard.value;
                } else if (turn.player2.value > turn.player1.value) {
                    score2 = score2 + turn.prizeCard.value;
                }
                else return;
            }
        })
    }

    function updateWinnings(history) {
        var player1winnings = []
        var player2winnings = []
        history.forEach(function (turn) {
            if (turn.player1.value > turn.player2.value) {
                player1winnings.push(turn.prizeCard)
            }
            if (turn.player1.value < turn.player2.value) {
                player2winnings.push(turn.prizeCard)
            }
        });
        if (playerAssignments(true) === "player1") {
            myWinnings = player1winnings;
            theirWinnings = player2winnings;
        } else {
            myWinnings = player2winnings;
            theirWinnings = player1winnings;
        }
    }

    function cardInitial(name) {
        var result = name;
        if (name === "Ace") {
            result = "A";
        } else if (name === "Jack") {
            result = "J";
        } else if (name === "Queen") {
            result = "Q";
        } else if (name === "King") {
            result = "K";
        }
        return result;
    }

    function turnResolve() {
        if (playerPlayed && opponentPlayed && !turnResolutionTime) {
            // hard coded match resolution condition as 13 turns
            if (turnHistory.length === 13) {
                matchResolutionTime = window.performance.now();
            }
            else {
                turnResolutionTime = window.performance.now();
            }
        }
    }

    // Polling and draw function invocations to start game!
    doPoll();
    draw();
})