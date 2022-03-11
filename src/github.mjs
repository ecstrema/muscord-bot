import { newsChannel } from "./vars.mjs";

export function handleGithub(m) {
    try {
        if (newsChannel) {
            if (m.name === "push")
                return;

            if (m.name === "pull_request") {
                const pr = m.payload.pull_request;
                const user = pr.user;
                const embed = new Discord.MessageEmbed();
                embed.setColor('#0099ff');
                embed.setAuthor(user.login, user.avatar_url, user.html_url);
                embed.setURL(pr.html_url);
                embed.setThumbnail("https://img.icons8.com/ios/452/pull-request.png");

                switch (m.payload.action) {
                    case "opened":
                        embed.setTitle("New Pull Request - " + pr.title);
                        embed.setDescription(`[\`#${pr.number}\`](${pr.html_url} 'View on github')\n\n${truncateString(pr.body, pr)}`);
                        break;

                    case "closed":
                        // The PR was merged. The discord github bot will take care of notifications.
                        if (pr.merged) return;
                        embed.setTitle("PR Closed - " + pr.title);
                        embed.setDescription(`[\`${pr.number}\`](${pr.html_url} '${truncateString(pr.body, pr)}')`);
                        break;

                    case "reopened":
                        embed.setTitle("PR Reopened - " + pr.title);
                        embed.setDescription(`[\`/${pr.number}\`](${pr.html_url} '${truncateString(pr.body, pr)}')`);
                        break;

                    case "ready_for_review":
                        embed.setTitle("PR Ready for review - " + pr.title);
                        embed.setDescription(`[\`/${pr.number}\`](${pr.html_url} '${truncateString(pr.body, pr)}')`);
                        break;

                    default:
                        // prevent sending the embed.
                        return;
                }
                newsChannel.send(embed);
                return;
            }
            if (m.name === "pull_request_review") {
                if (m.payload.action === "submitted") {
                    const user = m.payload.member;
                    const pr = m.payload.pull_request;
                    const review = m.payload.review;

                    const embed = new Discord.MessageEmbed();
                    embed.setColor('#0099ff');
                    if (user) embed.setAuthor(user.login, user.avatar_url, user.html_url);
                    embed.setURL(review.html_url);
                    embed.setTitle(`New review for PR#${pr.number}`);
                    if (review.body) {
                        embed.setDescription(truncateString(review.body, pr));
                    }
                    newsChannel.send(embed);
                }
                return;
            }

            if (m.name === "member") {
                if (m.payload.action === "added") {
                    const user = m.payload.member;
                    const embed = new Discord.MessageEmbed();
                    embed.setColor('#0099ff');
                    embed.setAuthor(user.login, user.avatar_url, user.html_url);
                    embed.setTitle("New Contributor!");
                    embed.setDescription(`Congrats to ${user.login} for being a new core contributor to the ${m.payload.repository.name} repository!\n:partying_face::love_you_gesture:`)
                    newsChannel.send(embed);
                }
                return;
            }

            if (m.name === "ping") {
                newsChannel.send("Github sent me this weird thing:");
                newsChannel.send(`"${m.payload.zen}"`);
                newsChannel.send("What do you think it means?");
                setTimeout(() => {
                    newsChannel.send("After confirmation with the folks at Github, it looks like we will be receiving news from a new repo: " + m.payload.repository.full_name + ". Wow. That's amazing.")
                }, 10000)
                return;
            }

            if (m.name === "star") {
                const stars = m.payload.repository.stargazers_count;
                if (!(stars % 1000)) {
                    newsChannel.send(`We reached ${stars} stars in the ${m.payload.repository.name} repo!`)
                }
                return;
            }

            if (m.name === "fork") {
                const forks = m.payload.repository.forks_count;
                if (!(forks % 1000)) {
                    newsChannel.send(`We reached ${forks} forks in the ${m.payload.repository.name} repo!`)
                }
                return;
            }

            if (m.name === "meta") {
                newsChannel.send("My github hook was deleted. :sad: I will not be able to receive any more news from my friends out there.")
                return;
            }

            if (m.name === "issues") {
                // embed.setThumbnail(http://cdn.onlinewebfonts.com/svg/img_2382.png);
                if (m.payload.action === "opened") {
                    const user = m.payload.sender;
                    const issue = m.payload.issue;
                    const embed = new Discord.MessageEmbed();
                    embed.setColor('#0099ff');
                    embed.setAuthor(user.login, user.avatar_url, user.html_url);
                    embed.setURL(issue.html_url);
                    embed.setTitle(`New Issue: ${issue.title}`);
                    embed.setDescription(truncateString(issue.body, issue));
                    newsChannel.send(embed);
                }
                return;
            }

            if (m.name === "issue_comment") {
                if (m.payload.action === "created") {
                    const user = m.payload.sender;
                    const issue = m.payload.issue;
                    const embed = new Discord.MessageEmbed();
                    embed.setColor('#0099ff');
                    embed.setAuthor(user.login, user.avatar_url, user.html_url);
                    embed.setURL(issue.html_url);
                    embed.setTitle(`New comment on "${issue.title}"`)
                    embed.setDescription(truncateString(m.payload.comment.body, issue))
                    newsChannel.send(embed);
                }
                return;
            }

            if (m.name === "milestone") {
                if (isOneIn(m.payload.action, ["opened"])) {
                    newsChannel.send(`${m.payload.sender.login} created a milestone: ${m.payload.milestone.title}\n${m.payload.issue.html_url}`)
                }
                return;
            }

            if (m.name === "release") {
                if (isOneIn(m.payload.action, ["published"])) {
                    newsChannel.send(`${m.payload.sender.login} published a release!\n${m.payload.issue.html_url}`)
                }
                return;
            }
            if (m.name === "secret_scanning_alert") {
                // Notify Igor Korsukov. Anyone else to notify?
                client.fetchUser('820950138125156353', false).then((user) => {
                    if (m.payload.action === "created") {
                        user.send('A secret was uncovered: ' + m.payload.alert.secret_type);
                    }
                    else if (m.payload.action === "resolved") {
                        user.send('The leaked secret (' + m.payload.alert.secret_type + ") alert has been resolved.");
                    }
                    else if (m.payload.action === "reopened") {
                        user.send('A secret leaked again: ' + m.payload.alert.secret_type);
                    }
                });
            }

            if (isOneIn(m.name, ["check_run", "check_suite"])) {
                return; // these events are not useful to us.
            }
            console.log("Received unknown event from github: " + m.name);
            // newsChannel.send("Received unknown event from github: " + m.name);
        }
        else {
            fetchChannel();
        }
    }
    catch (e) {
        console.error(e);
    }
}
