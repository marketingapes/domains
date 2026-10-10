"""Side-game rule pages. Rules describe common ways groups play; house rules vary and the pages say so."""

GAMES = [
 dict(slug="wolf", name="Wolf", glyph="W", color="#2a9d5c", sub="4 players · points",
  players="4 (works with 3 or 5)", time="Any 18 (or 9)", best="Foursomes who like choices", stakes="Points; a small value per point",
  title="Wolf Golf Game: Rules, Scoring and Strategy",
  desc="How to play Wolf in golf: the rotating Wolf, picking a partner or going Lone Wolf, a common points system, blind Wolf, holes 17 and 18, and a printable rotation and points sheet.",
  lede="Wolf turns every tee box into a decision. One player is the Wolf on each hole, watches the drives, and chooses a partner or goes it alone. It's the best four-player game for keeping everyone involved on every hole.",
  sections=[
   ("How a hole works", """<ol class="mini-steps">
<li><strong>Set the order.</strong> On the first tee, toss a tee to set a hitting order. The order rotates each hole so everyone takes turns in each position.</li>
<li><strong>One player is the Wolf.</strong> The most common setup has the Wolf hit first and pick a partner while watching the others drive. Some groups have the Wolf hit last instead. Decide before you start.</li>
<li><strong>Pick now or never.</strong> After each player's drive, the Wolf must say yes or no to that player right away, before the next player hits. Pass on someone and you can't go back for them.</li>
<li><strong>Or go Lone Wolf.</strong> If the Wolf passes on everyone, or announces Lone Wolf after hitting, it's the Wolf against the other three.</li>
<li><strong>Play the hole as best ball.</strong> Each side's lowest score on the hole counts. Lower team score wins the hole. A tie is usually a push, with no points.</li>
</ol>"""),
   ("Scoring: a common points system", """<p>Points are where groups vary most, so agree on them on the first tee. This setup is widely used and easy to remember:</p>
<table><thead><tr><th>Result</th><th>Points</th></tr></thead><tbody>
<tr><td>Wolf and partner win the hole</td><td>2 points each to the Wolf and partner</td></tr>
<tr><td>The other two win against Wolf and partner</td><td>3 points each to the two winners</td></tr>
<tr><td>Lone Wolf wins</td><td>4 points to the Wolf</td></tr>
<tr><td>Lone Wolf loses</td><td>1 point to each of the other three</td></tr>
<tr><td>Blind Wolf (declared before anyone tees off) wins</td><td>6 points to the Wolf (some groups simply double the Lone Wolf value)</td></tr>
<tr><td>Hole tied</td><td>No points</td></tr>
</tbody></table>
<p>At the end, compare totals. If you play for something, settle on the difference between each pair of players' points times your agreed value per point.</p>"""),
   ("Holes 17 and 18", """<p>Over 16 holes a four-player rotation gives everyone exactly four turns as Wolf. That leaves two holes. The most common house rule makes the player in <strong>last place</strong> the Wolf on 17 and 18, which gives them a chance to catch up. Another option is to double the points on the last two holes. Pick one before you tee off.</p>"""),
   ("Strategy that actually helps", """<ul class="checklist">
<li><strong>As Wolf, a good drive changes everything.</strong> If you split the fairway, a Lone Wolf is tempting, especially on a hole that suits your game.</li>
<li><strong>Don't fall in love with the first long drive.</strong> Fairway beats distance. A partner in the short grass usually beats one in the trees.</li>
<li><strong>Know your handicap strokes.</strong> If you play net, a player getting a stroke on a hard hole is often a better partner than the longest hitter.</li>
<li><strong>Lone Wolf on par 3s.</strong> On a short hole one swing decides a lot, and the odds are friendlier than on a long par 5.</li>
<li><strong>Keep score as you go.</strong> Arguments in Wolf are almost always about who picked whom. Note the teams on every hole.</li>
</ul>"""),
   ("Variations", """<ul>
<li><strong>Three players:</strong> the Wolf picks one partner and the third plays alone against them, or groups play Lone Wolf only. Adjust points so a solo winner gets more.</li>
<li><strong>Five players:</strong> the Wolf can pick one or two partners. Keep the points simple.</li>
<li><strong>Net Wolf:</strong> use handicap strokes on the holes where they fall, which keeps mixed-ability groups competitive.</li>
<li><strong>Pig / Wolf with a twist:</strong> some groups let a picked player refuse and play alone. That's a different game; agree before playing it.</li>
</ul>"""),
  ],
  example="""<p><strong>Example hole.</strong> Ana is Wolf and tees off first. Ben pulls his drive into the trees, so Ana passes. Cal finds the fairway and Ana takes him. Dee's drive goes after the pick, so Dee and Ben are a team. Ana and Cal make 4 and 5 (team score 4). Ben and Dee make 5 and 6 (team score 5). Ana and Cal win and get 2 points each.</p>""",
  tool="wolf",
  faq=[("How many players do you need for Wolf?","Four is ideal. It works with three or five if you adjust partnering and points."),
       ("Does the Wolf hit first or last?","Both are common. Hitting first means the Wolf watches every drive before deciding; hitting last means the Wolf picks before hitting. Decide on the first tee."),
       ("Is Wolf played with handicaps?","It can be. In a mixed group, use net scores with strokes given on the stroke-index holes.")],
  related=["nassau","skins","vegas"]),

 dict(slug="nassau", name="Nassau", glyph="N", color="#1d6b45", sub="3 bets in one",
  players="2 (or two teams of 2)", time="18 holes", best="Head-to-head matches", stakes="Three equal bets: front, back, overall",
  title="Nassau Golf Bet: How It Works, Presses and Scoring",
  desc="The Nassau golf bet explained: three bets for front nine, back nine and the full 18, match play scoring, how presses work (including the 2-down auto press), and a hole-by-hole match tracker.",
  lede="The Nassau is the classic golf bet: three matches in one round. A bad front nine doesn't end your day, because the back nine and the overall match are still live. Learn the press and you'll understand most golf bets you'll ever hear about.",
  sections=[
   ("The three bets", """<p>A Nassau is three separate bets of the same size:</p>
<ol><li><strong>The front nine</strong> (holes 1 to 9)</li><li><strong>The back nine</strong> (holes 10 to 18)</li><li><strong>The overall 18</strong></li></ol>
<p>So a "$2 Nassau" means $2 on the front, $2 on the back and $2 on the full round: the most anyone can win or lose without presses is $6. It works one-on-one or as two teams of two using best ball.</p>"""),
   ("Scoring each bet", """<p>Most Nassaus are played as <strong>match play</strong>: each hole is won, lost or halved, and you track who is "up". After nine holes the side that has won more holes wins the front bet. The overall works the same way across 18 holes.</p>
<p>You can also play a Nassau as stroke play (lowest total score for each nine and for 18). Match play is more common because a blow-up hole costs you only one hole, not the whole bet.</p>"""),
   ("Presses explained", """<p>A <strong>press</strong> is a new bet, the same size as the original, that starts on the next hole and runs to the end of that nine (or the round, for the overall). It gives the side that's behind a way back in.</p>
<ul class="checklist">
<li><strong>Manual press:</strong> the side that's down can ask for a press. The other side can accept or decline, depending on your rules.</li>
<li><strong>Automatic 2-down press:</strong> a very common rule. When a side goes 2 down in any active bet, a new bet starts automatically on the next hole.</li>
<li><strong>Presses can stack.</strong> If you go 2 down in a press, that can trigger another press. This is where the money adds up, so agree on a limit.</li>
<li><strong>Last-hole press:</strong> some groups allow a press on 9 or 18 even when only 1 down. Agree first.</li>
</ul>"""),
   ("Handicaps", """<p>For fair matches, the higher handicap usually gets the difference in strokes, applied on the holes ranked hardest on the scorecard (stroke index 1, 2, 3 and so on). In a Nassau you can also give strokes per nine: half the difference on each side.</p>"""),
   ("Etiquette", """<ul><li>Agree on the stakes, presses and handicaps on the first tee. Not on the 7th.</li><li>Keep the stakes friendly. The point is a better game, not a bad drive home.</li><li>Settle up at the end, not hole by hole.</li></ul>"""),
  ],
  example="""<p><strong>Example.</strong> You lose holes 2 and 4 and are 2 down after four. With an automatic 2-down press, a new front-nine bet starts on hole 5. You win 5, 7 and 9 and halve the rest. The press (holes 5 to 9) is yours 3 up, and the original front bet finishes 1 up to you too (lost two holes, won three). Two front-nine bets won from a bad start: that is why people love the press.</p>""",
  tool="nassau",
  faq=[("What does a $5 Nassau cost?","Up to $15 without presses: $5 each for the front nine, back nine and overall."),
       ("Is a Nassau match play or stroke play?","Usually match play, though some groups play it as stroke play. Agree first."),
       ("What is a press?","A new bet of the same size that starts on the next hole, usually offered or triggered when a side is 2 down.")],
  related=["skins","wolf","snake"]),

 dict(slug="skins", name="Skins", glyph="S", color="#e5483e", sub="win a hole, win a skin",
  players="2 to 6", time="Any number of holes", best="Groups of mixed ability", stakes="One unit per hole; carryovers add up",
  title="Skins Golf Game: Rules, Carryovers and a Skins Calculator",
  desc="How to play Skins in golf: winning a hole outright, carryovers on ties, validation rules, net skins with handicaps, and a free hole-by-hole skins calculator.",
  lede="Skins is the simplest money game in golf, and the most dramatic. Each hole is worth a skin. Win the hole outright and you take it. Tie, and the skin rolls to the next hole. A few ties in a row and one putt can decide a big pot.",
  sections=[
   ("The rules", """<ol class="mini-steps">
<li><strong>Each hole is worth one skin</strong> (or one unit of whatever you're playing for).</li>
<li><strong>Lowest score on the hole wins it outright.</strong> If two or more players tie for the lowest score, nobody wins it.</li>
<li><strong>Ties carry over.</strong> The unwon skin adds to the next hole. Two ties in a row means the next hole is worth three skins.</li>
<li><strong>At the end,</strong> count skins won. Settle the difference or pay from a pot.</li>
</ol>"""),
   ("Carryovers vs. no carryovers", """<p>Carryovers make Skins exciting, but they also mean the last holes can be worth a lot. If a skin is still carrying after 18, groups either play extra holes, split it, or let it die. Some groups play "no carryover": a tie simply kills that skin. That keeps the stakes small and the game calm.</p>"""),
   ("Validation and other house rules", """<ul class="checklist">
<li><strong>Validation:</strong> to collect a skin, the winner must tie or win the next hole (or make par on it). It stops a lucky one-hole wonder from scooping a big carryover.</li>
<li><strong>Net skins:</strong> use handicap strokes on the hardest holes. In mixed groups this is the fairest version.</li>
<li><strong>Gross and net:</strong> run two games side by side. Lower handicaps chase gross skins, everyone plays net.</li>
<li><strong>Birdie skins only:</strong> a fun variation for strong groups: only birdies win skins.</li>
</ul>"""),
   ("Strategy", """<p>Skins rewards aggression when a skin is carrying and patience when it isn't. With three skins riding on a par 3, aiming at the flag makes sense. On an ordinary hole with nothing carrying, a bogey costs you nothing compared with a double, so play the smart shot.</p>"""),
  ],
  example="""<p><strong>Example.</strong> On hole 1 Ana and Ben both make 4: no winner, one skin carries. On hole 2 Ana and Cal tie with 5: two skins carry. On hole 3 Ben makes 3 and everyone else 4: Ben wins three skins.</p>""",
  tool="skins",
  faq=[("What happens to a skin if nobody wins the last hole?","Agree before you start: play extra holes, split it evenly, or let it go unclaimed."),
       ("How many people can play Skins?","Any number from two upward. Four is the most common."),
       ("Is Skins fair for higher handicaps?","With net scoring (handicap strokes on the hardest holes) it can be very fair.")],
  related=["nassau","bingo-bango-bongo","snake"]),

 dict(slug="bingo-bango-bongo", name="Bingo Bango Bongo", glyph="B³", color="#ffc23a", sub="3 points every hole",
  players="3 or 4 (works up to 6)", time="Any 18 (or 9)", best="Mixed abilities and relaxed rounds", stakes="Points; small value per point",
  title="Bingo Bango Bongo: Golf Game Rules and Scoring",
  desc="How to play Bingo Bango Bongo: three points on every hole for first on the green, closest to the pin once all balls are on, and first in the hole. Why order of play matters, plus a points tracker.",
  lede="Bingo Bango Bongo gives away three points on every hole, and none of them depend on your score. That's why it's a favourite for groups where a scratch golfer plays with a weekend hacker. The short hitter is often first on the green.",
  sections=[
   ("The three points", """<table><thead><tr><th>Point</th><th>Goes to</th></tr></thead><tbody>
<tr><td><strong>Bingo</strong></td><td>The first player to get their ball onto the green</td></tr>
<tr><td><strong>Bango</strong></td><td>The player closest to the hole once every ball is on the green</td></tr>
<tr><td><strong>Bongo</strong></td><td>The first player to hole out</td></tr>
</tbody></table>
<p>Three points are available on every hole, so 54 over 18 holes. Most points wins.</p>"""),
   ("Order of play matters", """<p>The game only works if you follow honours strictly: <strong>the player farthest from the hole plays next</strong>, on every shot. That gives the short hitter, who is often away, the first chance to hit the green (Bingo). On the green, the player farthest away putts first, so a long lag that drops still wins Bongo.</p>"""),
   ("Common house rules", """<ul class="checklist">
<li>If nobody reaches the green in regulation, Bingo goes to the first player on in any number of shots.</li>
<li>Off-green chip-ins: if a player holes out from off the green, many groups award Bingo, Bango and Bongo to that player when nobody else is on yet.</li>
<li>For a faster game, play "ready golf" but keep strict honours on and around the green.</li>
</ul>"""),
   ("Why it works for mixed groups", """<p>Your total strokes don't matter, so a big number on one hole doesn't knock you out. Higher handicaps can win Bingo by laying up short and pitching on first, or Bongo by holing a long putt. It's the side game we'd suggest for a family round or a first round with new playing partners.</p>"""),
  ],
  example="""<p><strong>Example.</strong> Ben (furthest back) hits his third shot onto the green first: Bingo to Ben. Once all four balls are on, Cal is closest: Bango to Cal. Ben, still farthest away, putts first and holes it: Bongo to Ben. Ben 2, Cal 1.</p>""",
  tool="bbb",
  faq=[("Do you need handicaps for Bingo Bango Bongo?","No. That's the appeal: points don't depend on your score, so mixed abilities compete naturally."),
       ("What if two balls are equally close for Bango?","Very rare; if it happens, agree to split the point or award none."),
       ("Can you play it as a team game?","Yes: pair up and add partners' points together.")],
  related=["skins","wolf","snake"]),

 dict(slug="vegas", name="Vegas", glyph="V", color="#7b5cff", sub="2 v 2 · big swings",
  players="4 (two teams of 2)", time="Any 18", best="Confident groups who like action", stakes="Points; keep the value per point small",
  title="Vegas Golf Game: Rules, Birdie Flip and Scoring",
  desc="How to play the Vegas golf game: combine partners' scores into a two-digit team number, the birdie flip rule, how to handle scores of 10 or more, and a hole-by-hole Vegas calculator.",
  lede="Vegas is a two-versus-two game where the team's two scores are glued together into one number. Make a 4 and a 5 and your team number is 45. It produces big swings, which is half the fun, and the reason the value per point should stay small.",
  sections=[
   ("How team numbers work", """<ol class="mini-steps">
<li><strong>Pair up</strong> into two teams of two.</li>
<li><strong>Each player plays their own ball</strong> and holes out.</li>
<li><strong>Make the team number</strong> by putting the lower score first: a 4 and a 5 becomes 45; a 3 and a 6 becomes 36.</li>
<li><strong>Subtract.</strong> The team with the lower number wins the difference in points: 45 against 52 wins 7 points.</li>
</ol>"""),
   ("The birdie flip", """<p>The most common add-on: if a player makes a <strong>birdie</strong>, the <em>other</em> team's number flips so the higher digit goes first. If your partner birdies and the other team makes 4 and 6, their 46 becomes 64. Some groups also flip on an eagle and double the points. Agree before you start.</p>"""),
   ("Scores of 10 or more", """<p>A 10 makes a three-digit number (a 4 and a 10 is 410), and the swing can be huge. Many groups cap scores at double par or a triple bogey for Vegas purposes. Settle this on the first tee.</p>"""),
   ("Tips", """<ul class="checklist"><li>Keep the stake per point very small. A single blow-up hole can produce a 40 or 50 point swing.</li><li>Partners should play different strategies on a hole: one safe, one aggressive.</li><li>Use the calculator below; mental Vegas math after a long day gets creative.</li></ul>"""),
  ],
  example="""<p><strong>Example.</strong> Par 4. Team 1 makes 4 and 5 = 45. Team 2 makes 3 (birdie) and 6 = 36. Because of the birdie, Team 1's number flips to 54. Team 2 wins 54 &minus; 36 = 18 points.</p>""",
  tool="vegas",
  faq=[("Who goes first in a Vegas number?","The lower score: 4 and 6 is 46. A birdie by the opponents flips it to 64."),
       ("Is Vegas suitable for beginners?","It's easy to learn but the swings are large. Play for points, not money, until everyone's comfortable."),
       ("Can you play Vegas with handicaps?","Yes, using net scores, but agree how strokes interact with the birdie flip (most groups use gross birdies for the flip).")],
  related=["wolf","nassau","skins"]),

 dict(slug="snake", name="Snake", glyph="~", color="#20c1b0", sub="don't 3-putt",
  players="2 to 6", time="Any round", best="Any group: it's a side bet", stakes="A pot that grows, or a fixed amount",
  title="Snake Golf Game: The Three-Putt Side Bet",
  desc="How to play Snake in golf: the last player to three-putt holds the snake and pays, growing pot variations, and a simple snake tracker for your round.",
  lede="Snake is the side game that makes every short putt matter. Three-putt and you pick up the snake. Hold it at the end of the round and you pay. It runs alongside any other game and needs no math.",
  sections=[
   ("The rules", """<ol class="mini-steps">
<li><strong>The first player to three-putt</strong> takes the snake.</li>
<li><strong>The snake passes</strong> to the next player who three-putts.</li>
<li><strong>Whoever holds it at the end</strong> pays the agreed amount, either to each player or into the pot.</li>
</ol>
<p>If two players three-putt on the same hole, the last one to finish their putts usually takes the snake.</p>"""),
   ("Popular variations", """<ul class="checklist">
<li><strong>Growing snake:</strong> the value goes up by one unit every time the snake changes hands, so a late three-putt is expensive.</li>
<li><strong>Front and back:</strong> run two snakes, one per nine.</li>
<li><strong>Four-putt rule:</strong> a four-putt counts double.</li>
<li><strong>Off-green rule:</strong> putts from the fringe usually don't count; agree first.</li>
</ul>"""),
   ("Why it helps your game", """<p>Snake puts a little pressure on every lag putt and every three-footer, which is exactly the pressure you need to practise under. If the snake keeps finding you, the <a href="/get-better/putting-ladder-drill/">putting ladder drill</a> is the fix.</p>"""),
  ],
  example="""<p><strong>Example.</strong> Cal three-putts the 4th and takes the snake. Ana three-putts the 11th: the snake moves to Ana. Nobody else three-putts, so Ana pays.</p>""",
  tool="snake",
  faq=[("Does a three-putt from off the green count?","Usually not. Most groups only count putts taken from on the green."),
       ("Can Snake be played with other games?","Yes. It's a side bet that runs on top of Skins, Nassau or Wolf."),
       ("What happens if two players three-putt on the same hole?","The last player to hole out takes the snake.")],
  related=["skins","bingo-bango-bongo","nassau"]),
]

MORE_GAMES = [
 ("Rabbit","The first player to win a hole outright \"catches the rabbit\" and holds it until someone else wins a hole outright and sets it loose. Whoever holds the rabbit after 9 (and again after 18) wins that leg."),
 ("Hammer","A match-play add-on: a player or team can \"hammer\" to double the value of the hole. The other side must accept or concede the hole at the current value. Usually only the side that's down, or the side whose ball is in play, can hammer."),
 ("Stableford","Points instead of strokes: a common scale is double bogey or worse 0, bogey 1, par 2, birdie 3, eagle 4, albatross 5. Pick up when you can't score, which speeds up play."),
 ("Texas scramble","Everyone tees off, the team picks the best shot, and everyone plays from there. Usually each player's drive must be used a minimum number of times."),
 ("Florida scramble","A scramble where the player whose shot is chosen sits out the next shot. It keeps the best player from carrying the team."),
 ("Chapman / Pinehurst","Both partners drive, swap balls for the second shot, choose the better ball, then alternate shots to the hole."),
 ("Best ball / Four-ball","Each player plays their own ball; the team's best score on each hole counts. The format behind most member-guest events."),
 ("Dots (Trash or Garbage)","Side points for achievements: greenies (closest on a par 3 and making par), sandies (up and down from a bunker), barkies (par after hitting a tree) and more. Pick a list and keep it short."),
]
