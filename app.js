const Discord = require('discord.js');

// initialize dotenv
require('dotenv').config();

var client = new Discord.Client();
client.login(process.env.BOT_TOKEN);

client.on('ready', () => {
    console.log('Bot is ready');
});

let params = {
    muted_bool: false,
    minpr_number: 0,
    minissue_number: 100,
    timebeforedelete_number: 10000,
}

client.on('message', (msg) => {
    try {
        if (isOneIn(msg.content, ['/h', '/help', '/man'])) {
            msg.channel.send(`
This bot finds issues and pull requests in your comments and adds a link to them.
To reference issues, use #issue_number, and for PRs use pr#pr_number.

Additionnal commands include:
 - \`/mute\`: Prevent the bot from sending additionnal messages. It will still be listening (and answering) to commands.
 - \`/unmute\`: unmute the bot.
 - \`/restart\`: Recreate the discord bot client.
 - \`/delete n\`: Delete the last n messages. Use without n to delete only the last one.
 - \`/set target value\`: Set a parameter (\`target\`) to \`value\`. Available parameters are:
    - \`minissue_number (default value: \`100\`): The minimum issue number required in #number before linking it.
    - \`minpr_number\` (default value: \`0\`): The minimum number required in pr#number before linking it.
    - \`timebeforedelete_number\` (default value: \`10000\`): some of this bots' messages autodelete after some time. Use this value (in ms) to configure it.
    - \`muted_bool\` (default value: \`false\`): Whether the bot is muted. See also \`/mute\` and \`/unmute\`.
            `)
        }
        if (msg.content === '/mute') {
            if (params.muted_bool) {
                reply(msg, ["Already Muted", "Sorry Sir, but I cannot talk."]);
                return;
            }
            params.muted_bool = true;
            reply(msg, ['Muted']);
            return;
        }
        if (msg.content === '/unmute') {
            if (params.muted_bool) {
                params.muted_bool = false;
                reply(msg, ["Unmuted", "Ooof. Feels good to speaak."]);
                return;
            }
            reply(msg, ["And why would you think I am muted?", "I am already free to speak."]);
            return;
        }
        if (isOneIn(msg.content, ['/integrate', 'restart'])) {
            client = new Discord.Client();
            client.login(process.env.BOT_TOKEN);

            client.on('ready', () => {
                reply(msg, ["Channel integrated", " - Ooouiiiin...\n - Look! It's a bot!"]);
            });
            return;
        }

        if (msg.content.startsWith('/set')) {
            const args = msg.content.split(' ');
            let target = args[1];
            if (!target) {
                reply(msg, [`Invalid usage: no value specified.\nExample of correct usage: \`/set minpr_number 250\``]);
                return;
            }
            target = target.toLowerCase();
            if (isOneIn(target, ["h", "help", "man"])) {
                let str = "Valid options are:\n";
                for (const key in params) {
                    if (Object.hasOwnProperty.call(params, key)) {
                        const value = params[key];
                        str += ` - ${key} (current value: ${value});\n`;
                    }
                }
                msg.reply(str + "Hope that helps!");
                return;
            }

            let value = args[2];
            if (!value) {
                reply(msg, [`Invalid usage: no value specified.\nExample of correct usage: \`/set minpr_number 250\``]);
                return;
            }
            value = value.toLowerCase();

            if (target.endsWith('_number')) {
                const n = parseInt(args[2]);
                if (!Number.isFinite(n)) {
                    msg.reply(`Invalid usage: target value should be a number.\nExample of correct usage: \`/set ${target} 250\``);
                    return;
                }
                else {
                    if (params.hasOwnProperty(target)) {
                        params[target] = n;
                    }
                }
            }
            else if (target.endsWith('_bool')) {
                if (params.hasOwnProperty(target)) {
                    if (isOneIn(value, ["false", "f", "0", "No"])) {
                        params[target] = false;
                        msg.reply(`${target} set to false`);
                        return;
                    }
                    else {
                        params[target] = true;
                        msg.reply(`${target} set to true`);
                        return;
                    }
                }
            }
            else {
                if (!params.hasOwnProperty(target)) {
                    msg.reply(`I do not have such a configuration variable: \`${args[1]}\`\nThese are my options: ${JSON.stringify(params)}`);
                    return;
                }
                params[target] = value;
            }
            msg.reply(`${target} set to ${value}`);
            return;
        }
        if (msg.content.startsWith('/delete')) {
            let n = parseInt(msg.content.split(' ')[1]);
            if (!Number.isFinite(n)) {
                n = 1;
            }
            const n_copy = n;
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
                let bot_msg_promise = null;
                const willDisappear = `\nThis message will disappear in ${(params.timebeforedelete_number * 0.001).toFixed(2)} seconds.`;
                if (n_copy > 1) {
                    bot_msg_promise = send(msg.channel,
                        [`I just $%#$@@$#@*&^ my last ${n_copy} messages.`,
                         "Your orders have been executed, Sir.",
                         "Done.", "Thank you my dear, they were annoying me too.",
                         "Ohhh... Look! They disappeared!",
                         `A wild ${n_copy} messages has disappeared!`].map((m) => m + willDisappear ));
                }
                else {
                    bot_msg_promise = send(msg.channel, ["Deleted last message."].map((m) => m + willDisappear ));
                }
                msg.delete();
                if (bot_msg_promise && params.timebeforedelete_number) {
                    bot_msg_promise.then((bot_msg) => {
                        setTimeout(() => {
                            bot_msg.delete();
                        }, params.timebeforedelete_number);
                    })
                }
            });
            return;
        }
        if (msg.content.includes("interesting") && msg.author.id !== client.user.id) {
            send(msg.channel, ["This certainly is interesting...", "very... interesting", "how interesting..."]
            .map((m) => { return m + "\nhttps://en.wikipedia.org/wiki/Special:Random"}));
            return;
        }
        if (isOneIn(msg.content, ["Thank you", "Merci", "Danke"]) && msg.author.id !== client.user.id) {
            send(msg.channel, ["You're Welcome", "It's a pleasure", "Wow that's kind", ":heart:"]);
            return;
        }
        if (containsOneIn(msg.content, ["Thank you", "Merci", "Danke", "Gracias"]) && msg.author.id !== client.user.id) {
            send(msg.channel, ["You're Welcome", "It's a pleasure", "Wow that's kind", ":heart:", "De nada", "El placer es mio", "De rien", "Je suis la pour vous servir..."]);
            return;
        }
        if (params.muted_bool) {
            return;
        }
        if (msg.author.id !== client.user.id) {
            let content = msg.content.replace(/ +/g, '');;
            const prs = content.match(/pr#(\d+)/gi);
            if (prs) {
                for (const pr of prs) {
                    if (!pr) {
                        continue;
                    }
                    const strNumber = pr.substr(3);
                    const n = parseInt(strNumber, 10);
                    if (n > params.minpr_number) {
                        msg.channel.send("https://musescore.org/node/" + strNumber);
                        return;
                    }
                }
            }
            const issues = content.match(/(?<!pr)#(\d+)/gi);
            if (issues) {
                for (const issue of issues) {
                    if (!issue) {
                        continue;
                    }
                    const strNumber = issue.substr(1);
                    const n = parseInt(strNumber, 10);
                    if (n > params.minissue_number) {
                        msg.channel.send("https://github.com/musescore/MuseScore/pull/" + strNumber);
                        return;
                    }
                }
            }
        }
    }
    catch(e) {
        console.log(e);
        client = new Discord.Client();
        client.login(process.env.BOT_TOKEN);

        client.on('ready', () => {
            send(msg.channel, ["I crashed but restarted.", "Wowowowow I just keep crashin'", "Good thing the ground is there, cause I keep crashin'"]);
        });
        return;
    }
});

function reply(msg, choices) {
    return msg.reply(choices[Math.floor(Math.random() * choices.length)]);
}

function send(channel, choices) {
    return channel.send(choices[Math.floor(Math.random() * choices.length)])
}

function isOneIn(str, array) {
    for (const t of array) {
        if (str === t) {
            return true;
        }
    }
    return false;
}
function containsOneIn(str, array) {
    for (const t of array) {
        if (str.includes(t)) {
            return true;
        }
    }
    return false;
}
