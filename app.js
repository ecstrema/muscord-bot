const Discord = require('discord.js');

// initialize dotenv
require('dotenv').config();

var client = new Discord.Client();
client.login(process.env.BOT_TOKEN);

client.on('ready', () => {
    console.log('Bot is ready');
});

let muted = false;

client.on('message', (msg) => {
    try {

        if (msg.content === '/mute') {
            if (muted) {
                reply(msg, ["Already Muted", "Sorry Sir, but I cannot talk."]);
                return;
            }
            muted = true;
            reply(msg, ['Muted']);
            return;
        }
        if (msg.content === '/unmute') {
            if (muted) {
                muted = false;
                reply(msg, ["Unmuted", "Ooof. Feels good to speaak."]);
                return;
            }
            reply(msg, ["And why would you think I am muted?", "I am already free to speak."]);
            return;
        }
        if (msg.content === '/integrate') {
            client = new Discord.Client();
            client.login(process.env.BOT_TOKEN);

            client.on('ready', () => {
                reply(msg, ["Channel integrated", " - Ooouiiiin...\n - Look! It's a bot!"]);
            });
            return;
        }
        if (msg.content.startsWith('/delete')) {
            let n = parseInt(msg.content.split(' ')[1]);
            if (typeof n !== 'number') {
                n = 1;
            }
            msg.channel.messages.fetch({
                limit: 100
            }).then(messages => {
                const msgs = messages.filter(m => {
                    if (!m) {
                        return false;
                    }
                    return m.author.id === client.user.id;
                });
                for (const m of msgs) {
                    if (!m) {
                        break;
                    }
                    m[1].delete();
                    n--;
                    if (n < 1) {
                        break;
                    }
                }
                msg.delete();
            });
            return;
        }
        if (msg.content.includes("interesting") && msg.author.id !== client.user.id) {
            send(msg.channel, ["This certainly is interesting...", "very... interesting", "how interesting..."]
            .map((m) => { return m + "\nhttps://en.wikipedia.org/wiki/Special:Random"}));
            return;
        }
        if (isOneIn(msg, ["Thank you", "Merci", "Danke"])) {
            send(msg.channel, ["You're Welcome", "It's a pleasure", "Wow that's kind", ":heart:"]);
            return;
        }
        if (containsOneIn(msg, ["Thank you", "Merci", "Danke", "Gracias"])) {
            send(msg.channel, ["You're Welcome", "It's a pleasure", "Wow that's kind", ":heart:", "De nada", "El placer es mio", "De rien", "Je suis la pour vous servir..."]);
            return;
        }
        if (muted) {
            return;
        }
        if (msg.author.id !== client.user.id) {
            const prs = msg.content.match(/pr#(\d+)/gi);
            if (prs) {
                for (const pr of prs) {
                    if (!pr) {
                        continue;
                    }
                    msg.channel.send("https://musescore.org/node/" + pr.substr(3));
                }
            }
        }
    }
    catch(e) {
        console.log(e);
        client = new Discord.Client();
        client.login(process.env.BOT_TOKEN);

        client.on('ready', () => {
            send(msg.channel, ["I crashed but restarted.", "Wowowowow I just keep crashin", "Good thing the ground is there, cause I keep crashin'"]);
        });
        return;
    }
});

function reply(msg, choices) {
    msg.reply(choices[Math.floor(Math.random() * choices.length)]);
}

function send(channel, choices) {
    channel.send(choices[Math.floor(Math.random() * choices.length)])
}

function isOneIn(msg, array) {
    for (const t of array) {
        if (msg.content === t) {
            return true;
        }
    }
    return false;
}
function containsOneIn(msg, array) {
    for (const t of array) {
        if (msg.content.includes(t)) {
            return true;
        }
    }
    return false;
}
