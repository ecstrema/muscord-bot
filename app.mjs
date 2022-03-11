import * as Discord from "discord.js";
import * as fetch from 'node-fetch';
import * as nacl from 'tweetnacl';
import { DiscordInteractions } from "slash-commands";
import { Webhooks } from "@octokit/webhooks";

import { setupDiscord } from "./src/discord.mjs";
import { setupGithub } from "./src/github.mjs";
import { setupEnvironment, env } from "./src/vars.mjs";


setupEnvironment();

setupGithub();
setupDiscord();

let client = new Discord.Client();
client.login(env.BOT_TOKEN);

client.on('ready', () => {
    console.log('Bot is ready');
    fetchChannel();
});

const webhooks = new Webhooks({
  secret: env.WEBHOOK_TOKEN,
  path: "/github"
});

webhooks.onAny(handleGithub);

require("http").createServer((req, res) => {
    if (req.url === "/github") {
        webhooks.middleware(req, res);
        return;
    }
    else if (req.url === "/discord") {
        // The public key can be found on your application in the Developer Portal
        const PUBLIC_KEY = '02da8fc1549bb4f83c88488bc9c7df5a7ae863a9b903b3e6673af88d324a6df5';

        const signature = req.headers['x-signature-ed25519'];
        const timestamp = req.headers['x-signature-timestamp'];
        let body = [];
        req.on('data', (chunk) => {
            body.push(chunk);
        });
        req.on("end", () => {
            body = Buffer.concat(body).toString();
            console.log(body);

            const isVerified = nacl.sign.detached.verify(
                Buffer.from(timestamp + body),
                Buffer.from(signature, 'hex'),
                Buffer.from(PUBLIC_KEY, 'hex')
            );
            body = JSON.parse(body);

            if (!isVerified) {
                console.log("invalid signature");
                res.statusCode = 401;
                res.end('invalid request signature');
                return;
            }

            res.setHeader('Content-Type', 'application/json');
            // respond to ping request.
            if (body.type === 1) {
                res.end(
                  JSON.stringify({
                    type: 1,
                  }),
                );
                initSlashCommands();
                return;
            }
            if (body.data && body.data.name && body.data.name === "wakeup") {
                res.statusCode = 200;
                const responseBody = {
                    type: 4,
                    data: {
                        content: getOneOf(
                            [
                            "Wow, I was sleeping well.",
                            "What was that for! I was making a wonderful dream in a world free of " + getOneOf(["humans.", body.member.user.username + "."]),
                            "Oh did I sleep too much?",
                            "Sorry sir. Someone told me sleeping was essential... Please accept my sincere excuses. I will not do it again.",
                            "Oh lord and when is it that I get to sleep?"
                            ]),
                        flags: 64,
                    },
                }
                res.end(JSON.stringify(responseBody));
                return;
            }
            else {
                console.log("Unknown or invalid command.");
            }
            res.statusCode = 404;
            res.end();
            // Note: the 2 lines above could be replaced with this next one:
            // response.end(JSON.stringify(responseBody))
        });

    }
}).listen(3000);
// can now receive webhook events at port 3000


let params = {
    muted_bool: false,
    minpr_number: 0,
    minmsissue_number: 100,
    minghissue_number: 0,
    timebeforedelete_number: 5000,
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

Note that you can always wake me up by visiting https://musebot-discord.glitch.me.

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
        if (isOneIn(msg.content, ['/integrate', '/restart'])) {
            client = new Discord.Client();
            client.login(env.BOT_TOKEN);

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
        if (msg.content.startsWith('/expelliarmus') && msg.author.id !== client.user.id) {
            reply(msg, ["Avada Kedavra!", "Alohomora!", "Arania Exumai"]);
            return;
        }
        if (msg.content.toLowerCase().includes("interesting...") && msg.author.id !== client.user.id) {
            linkRandomPages(msg, "https://en.wikipedia.org/wiki/Special:Random",
                [
                "This certainly is interesting...",
                "very... interesting",
                "how interesting..."
                ]);
        }
        if (msg.content.toLowerCase().includes("beautiful") && msg.author.id !== client.user.id) {
          linkRandomPages(msg, "https://source.unsplash.com/featured/?future",
              [
              "This certainly is beautiful...",
              "very... beautiful",
              "how beautiful..."
              ]);
        }
        if (msg.content.toLowerCase().includes("random") && msg.author.id !== client.user.id) {
          linkRandomPages(msg, "https://source.unsplash.com/featured/?rock",
              [
              "This certainly is random...",
              "very... random",
              "how random..."
              ]);
        }
        if (isOneIn(msg.content, ["Thank you", "Merci", "Danke", "Gracias"]) && msg.author.id !== client.user.id) {
            send(msg.channel, ["You're Welcome", "It's a pleasure", "Wow that's kind", ":heart:", "De nada", "El placer es mio", "De rien", "Je suis la pour vous servir..."]);
        }
        if (containsOneIn(msg.content.toLowerCase(), ["@musebot", "discord bot"]) && msg.author.id !== client.user.id) {
            reply(msg, ["... Well that's fun...", "Now that the truth is uncovered...", "Just who exactly do you think I am?", "That is your opinion.", "Wow that's so... meaningful!", "Could you guys please ban him?", "Hey I am not some kind of mere robot!"])
        }
        if (containsOneIn(msg.content.toLowerCase(), ["robot"]) && msg.author.id !== client.user.id) {
            reply(msg, ["Speaking 'bout robots?", "Did someone say robot?", "Did I just hear robot?"]);
        }
        if (containsOneIn(msg.content.toLowerCase(), ["stackoverflow", "stack overflow"]) && msg.author.id !== client.user.id) {
            reply(msg, ["https://ahseeit.com//king-include/uploads/2021/01/125920649_1067274367017645_4260770275982334374_n-5042670445.jpg", "https://ahseeit.com//king-include/uploads/2021/02/97526840_701585793923629_6447559898216910734_n-4207642023.jpg", "Yeah me too I love stack overflow.", "https://ahseeit.com//king-include/uploads/2021/01/75458008_176992410096750_8646005410414874101_n-9825644198.jpg", "https://ahseeit.com//king-include/uploads/2021/01/121828819_3394846430607680_6583390831866418771_n-2074747303.jpg", "https://ahseeit.com//king-include/uploads/2021/01/131894480_228511955346726_3797468041544343565_n-431975422.jpg"])
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
        console.error(e);
        client = new Discord.Client();
        client.login(env.BOT_TOKEN);

        client.on('ready', () => {
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
    // testing
    // client.channels.fetch('821194544825237518')

    // actual Musescore channel
    client.channels.fetch('818848130027880479')
        .then((channel) => {
            newsChannel = channel;
            console.log("Pushing news to: " + channel.name);
        })
        .catch(console.error);
}



async function initSlashCommands() {
    // disable slash commands
    // return;

    const interaction = new DiscordInteractions({
        applicationId: "821194769941790740",
        authToken: env.BOT_TOKEN,
        publicKey: "02da8fc1549bb4f83c88488bc9c7df5a7ae863a9b903b3e6673af88d324a6df5",
      });

    const wakeup = {
        "name": "wakeup",
        "description": "Wake up a sleeping musebot"
      }
    const commands = await interaction.getApplicationCommands();
    if (!commands[0].name === "wakeup") {
        await interaction.createApplicationCommand(wakeup, "821531129382305814").catch(console.error);
    }
}

function truncateString(s, pr = null, maxLength = 1750) {
  if (!s) return "";
  if (s.length > maxLength)
    return s.substring(0, maxLength) + "\nMessage truncated at " + maxLength + " characters" + pr ? `, [\`#${pr.number}\`](${pr.html_url} 'view on github')` : "."

  return s;
}
