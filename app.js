const Discord = require('discord.js');
const fetch = require('node-fetch');

// initialize dotenv
require('dotenv').config();

var client = new Discord.Client();
client.login(process.env.BOT_TOKEN);

var newsChannel = null;

client.on('ready', () => {
    console.log('Bot is ready');
    fetchChannel();
});

// install with: npm install @octokit/webhooks
const { Webhooks } = require("@octokit/webhooks");

require('dotenv').config();

const webhooks = new Webhooks({
  secret: process.env.WEBHOOK_TOKEN,
});

webhooks.onAny((m) => {
    if (newsChannel) {
        newsChannel.send(m.name + " event received");
        if (m.name === "push") {
            if (!m.payload.commits.length) return;

            const branch = m.payload.ref.replace("refs/heads/", "");
            const message = m.payload.commits[0].message.slice(0, 70);
            const link = m.payload.commits[0].url

            if (m.payload.commits.length > 1) {
                newsChannel.send(`${m.payload.pusher.name} pushed ${m.payload.commits.length} commits to ${branch}, including ${message}\n${link}`);
            }
            else {
                newsChannel.send(`${m.payload.pusher.name} pushed commit to ${branch}: ${message}\n${link}`);
            }
            return;
        }

        if (m.name === "pull_request") {
            console.log(m.payload);
            newsChannel.send(`New Pull Request: ${m.payload.pull_request.number} - ${m.payload.pull_request.title} by ${m.payload.pull_request.user.login}\n${m.payload.pull_request.html_url}`);
            return;
        }

        if (m.name === "watch") {
            const stars = m.payload.repository.watchers_count;
            if (!stars % 1000) {
                newsChannel.send(`We reached ${stars} stars in the ${m.payload.repository.name} repo!`)
            }
            return;
        }

        if (m.name === "fork") {
            const forks = m.payload.repository.forks_count;
            if (!forks % 1000) {
                newsChannel.send(`We reached ${forks} forks in the ${m.payload.repository.name} repo!`)
            }
            return;
        }

        newsChannel.send("Received unknown event from github: " + m.name);
    }
    else {
        fetchChannel();
    }
});

require("http").createServer(webhooks.middleware).listen(3000);
// can now receive webhook events at port 3000

let params = {
    muted_bool: false,
    minpr_number: 0,
    minmsissue_number: 100,
    minghissue_number: 0,
    timebeforedelete_number: 10000,
}

client.on('message', (msg) => {
    try {
        if (isOneIn(msg.content, ['/h', '/help', '/man'])) {
            msg.channel.send(`
This bot finds issues and pull requests in your comments and adds a link to them.
To reference issues, use ms#issue_number, and for PRs use pr#pr_number. For github issues, use gh#issue_number.

Additionnal commands include:
 - \`/mute\`: Prevent the bot from sending additionnal messages. It will still be listening (and answering) to commands.
 - \`/unmute\`: unmute the bot.
 - \`/restart\`: Recreate the discord bot client.
 - \`/delete n\`: Delete the last n messages. Use without n to delete only the last one.
 - \`/set target value\`: Set a parameter (\`target\`) to \`value\`. Available parameters are:
    * \`minmsissue_number\` (default value: \`100\`): The minimum issue number required in #number before linking to an issue on musescore.org.
    * \`minghissue_number\` (default value: \`100\`): The minimum issue number required in #number before linking to an issue on github.
    * \`minpr_number\` (default value: \`0\`): The minimum number required in pr#number before linking it.
    * \`timebeforedelete_number\` (default value: \`10000\`): some of this bot's messages autodelete after some time. Use this value (in ms) to configure it.
    * \`muted_bool\` (default value: \`false\`): Whether the bot is muted. See also \`/mute\` and \`/unmute\`.

If you encounter any issue/typo visit https://github.com/Marr11317/muscord-bot.
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
            const args = msg.content.trim().split(/ +/);
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
            let n = parseInt(msg.content.trim().split(/ +/)[1]);
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
                    bot_msg_promise = send(msg.channel, ["Deleted last message.", "Message deleted."].map((m) => m + willDisappear ));
                }
                // msg.delete();
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
        if (params.muted_bool) {
            return;
        }
        if (msg.content.toLowerCase().includes("interesting...") && msg.author.id !== client.user.id) {
            linkRandomPages(msg, "https://en.wikipedia.org/wiki/Special:Random",
                [
                "This certainly is interesting...",
                "very... interesting",
                "how interesting..."
                ])
        }
        if (msg.content.toLowerCase().includes("beautiful") && msg.author.id !== client.user.id) {
          linkRandomPages(msg, "https://source.unsplash.com/featured/?future",
              [
              "This certainly is beautiful...",
              "very... beautiful",
              "how beautiful..."
              ])
        }
        if (msg.content.toLowerCase().includes("random") && msg.author.id !== client.user.id) {
          linkRandomPages(msg, "https://source.unsplash.com/featured/?rock",
              [
              "This certainly is random...",
              "very... random",
              "how random..."
              ])

        }
        if (isOneIn(msg.content, ["Thank you", "Merci", "Danke"]) && msg.author.id !== client.user.id) {
            send(msg.channel, ["You're Welcome", "It's a pleasure", "Wow that's kind", ":heart:"]);
            return;
        }
        if (isOneIn(msg.content, ["Thank you", "Merci", "Danke", "Gracias"]) && msg.author.id !== client.user.id) {
            send(msg.channel, ["You're Welcome", "It's a pleasure", "Wow that's kind", ":heart:", "De nada", "El placer es mio", "De rien", "Je suis la pour vous servir..."]);
        }
        if (containsOneIn(msg.content, ["@musebot"])) {
            reply(msg, ["... Well that's fun...", "Now that the truth is uncovered...", "Just who exactly do you think I am?", "That is your opinion.", "Wow that's so... meaningful!", "Could you guys please ban him?", "Hey I am not some kind of mere robot!"])
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
                        msg.channel.send("https://github.com/musescore/MuseScore/pull/" + strNumber);
                    }
                }
            }
            const ghIssues = content.match(/gh#(\d+)/gi);
            if (ghIssues) {
                for (const issue of ghIssues) {
                    if (!issue) {
                        continue;
                    }
                    const strNumber = issue.substr(3);
                    const n = parseInt(strNumber, 10);
                    if (n > params.minghissue_number) {
                        msg.channel.send("https://github.com/musescore/MuseScore/issues/" + strNumber);
                    }
                }
            }
            const issues = content.match(/ms#(\d+)/gi);
            // const issues = content.match(/(?<!pr)(?<!gh)(?<!ms)#(\d+)/gi);
            if (issues) {
                for (const issue of issues) {
                    if (!issue) {
                        continue;
                    }
                    const strNumber = issue.substr(3);
                    const n = parseInt(strNumber, 10);
                    if (n > params.minmsissue_number) {
                        msg.channel.send("https://musescore.org/node/" + strNumber);
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
            console.log("Bot is ready");
            send(msg.channel, ["I crashed but restarted. Casually.", "Wowowowow I just keep crashin'", "Good thing the ground is there, cause I keep crashin'"]);
        });
        return;
    }
});

function linkRandomPages(msg, url, choices) {
    fetch(url + "?sig=" + Math.floor(Math.random() * 1000000), { method: 'GET', }).then((response) => {
        send(msg.channel, choices.map((m) => { return `${m}\n${response.url}` }));
    })
}

function reply(msg, choices) {
    return msg.reply(getOneOf(choices));
}

function send(channel, choices) {
    return channel.send(getOneOf(choices));
}

function getOneOf(choices) {
    return choices[Math.floor(Math.random() * choices.length)];
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

function fetchChannel() {
    client.channels.fetch('821194544825237518')
        .then((channel) => {
            newsChannel = channel;
            console.log("Pushing news to: " + channel.name);
        })
        .catch(console.error);
}
