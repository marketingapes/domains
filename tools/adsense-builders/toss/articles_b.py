ARTICLES = []

ARTICLES.append(dict(
    slug="how-bowling-scoring-works",
    title="How bowling scoring works (and what a league handicap is)",
    desc="Bowling scoring made simple: frames, strikes, spares and the tenth frame, with a worked example, plus how league handicaps level the lanes.",
    dek="Strikes, spares, the tenth frame and league handicaps, with a worked example you can follow along with.",
    alt="A bowler releases a ball down a wooden lane toward ten pins, beside a score sheet with a strike and a spare",
    cat="rules", cat_label="Rules",
    related=["cornhole-rules-and-scoring", "how-to-be-a-good-rec-league-captain", "how-to-find-an-adult-rec-league"],
    faq=[
        ("What is a perfect game in bowling?", "A perfect game is 300: twelve strikes in a row, one in each of the first nine frames and three in the tenth."),
        ("What does a dash mean on a bowling score sheet?", "A dash marks a ball that knocked down no pins. It is sometimes called a miss or, when it happens on the second ball of a frame, an open frame."),
        ("What is a split?", "A split is a leave where the headpin is down and the remaining pins are separated by a gap, such as the 7 and 10. Splits are hard to convert into spares, so they are often marked with a circle on the score sheet."),
        ("Do I need my own ball to join a league?", "No. Most bowling centres have house balls and rental shoes. Many league bowlers eventually buy a ball drilled to fit their hand, but it is not needed to start."),
    ],
    body="""
<p>Bowling is one of the easiest social sports to join: the venue supplies the lanes, the balls and the shoes, and the automatic scoring does the maths. But if you want to understand why a strike is worth so much more than nine pins, or what the league secretary means by "handicap", it helps to know how the scoring actually works. Once it clicks, you will find yourself calculating your score before the screen does.</p>

<h2>The basics: ten frames, ten pins</h2>
<p>A game of ten-pin bowling has ten frames. In each frame you get up to two balls to knock down ten pins. If you knock them all down with your first ball, the frame ends immediately. The tenth frame is special and can include a third ball, which we will cover below.</p>
<p>If you do not knock down all ten pins across your two balls, your score for that frame is simply the number of pins you knocked down. That is called an open frame. The fun begins when you knock them all down.</p>

<h2>Strikes and spares</h2>
<ul>
<li><strong>Strike (X):</strong> all ten pins down with the first ball of a frame. You score 10 plus the pins you knock down with your next two balls.</li>
<li><strong>Spare (/):</strong> all ten pins down using both balls of a frame. You score 10 plus the pins you knock down with your next ball.</li>
</ul>
<p>Those bonus balls are why strikes and spares are so valuable. A strike followed by another strike followed by another strike gives the first frame 30 points. String twelve strikes together across a game and you score the maximum, 300.</p>
<p>Because a frame's score can depend on balls you have not rolled yet, the running total for a strike or spare frame stays blank until the bonus balls are known. That is why the scoreboard sometimes seems to be a frame or two behind.</p>

<h2>A worked example</h2>
<p>Here is how the first six frames of a made-up game add up. Follow the running total column to see how the bonuses land.</p>
<div class="table-wrap"><table>
<thead><tr><th>Frame</th><th>Balls</th><th>How it is scored</th><th>Running total</th></tr></thead>
<tbody>
<tr><td>1</td><td>X</td><td>10 + next two balls (7 + 3) = 20</td><td>20</td></tr>
<tr><td>2</td><td>7 /</td><td>10 + next ball (9) = 19</td><td>39</td></tr>
<tr><td>3</td><td>9 &ndash;</td><td>Open frame: 9 + 0 = 9</td><td>48</td></tr>
<tr><td>4</td><td>X</td><td>10 + next two balls (10 + 8) = 28</td><td>76</td></tr>
<tr><td>5</td><td>X</td><td>10 + next two balls (8 + 1) = 19</td><td>95</td></tr>
<tr><td>6</td><td>8 1</td><td>Open frame: 8 + 1 = 9</td><td>104</td></tr>
</tbody></table></div>
<p>Notice how frame 4's strike earned bonus pins from both frame 5 (a strike, 10) and the first ball of frame 6 (8). Frame 3's nine pins were followed by a miss, shown as a dash.</p>

<h2>The tenth frame</h2>
<p>The last frame gives you the chance to collect the bonus balls you would otherwise miss out on:</p>
<ul>
<li>If you roll a strike with your first ball, you get two more balls.</li>
<li>If you roll a spare with your first two balls, you get one more ball.</li>
<li>If you leave pins standing after two balls, your game is over.</li>
</ul>
<p>So the tenth frame can be up to three balls, and the most it can score is 30 (three strikes).</p>

<h2>Reading the score sheet</h2>
<p>Bowling has its own shorthand. Here are the symbols you will see on most screens and paper sheets:</p>
<div class="box">
<h3>Score sheet symbols</h3>
<ul>
<li><strong>X</strong>: strike</li>
<li><strong>/</strong>: spare</li>
<li><strong>&ndash;</strong>: a ball that knocked down no pins</li>
<li><strong>F</strong>: foul (you crossed the foul line); the ball counts as zero pins</li>
<li><strong>Circled number</strong>: a split was left</li>
<li><strong>G</strong> (on some systems): a gutter ball</li>
</ul>
</div>

<h2>What a league handicap is</h2>
<p>Most social and many competitive bowling leagues use handicaps so bowlers of different skill can compete on even terms. The idea is simple: bowlers with lower averages get bonus pins added to each game.</p>
<p>Leagues set their own formula, but a common approach is to take a percentage of the difference between a basis score and your average. For example, a league might use 90 percent of the difference between 220 and your average. A bowler averaging 150 would get 90 percent of 70, which is 63 pins added per game. A bowler averaging 200 would get 18. Teams usually add up their bowlers' handicaps too.</p>
<p>New bowlers without an established average often bowl a few games before a handicap is set, or are given a starting average by the league. Ask your league secretary how they handle it, and remember that a handicap is not charity: it is the reason a brand-new team can win the whole season.</p>

<h2>Etiquette on league night</h2>
<p>Bowling has a few unwritten rules that make the night run smoothly. The bowler on your right usually goes first if you are both ready at the same time. Stay behind the foul line. Do not use someone else's ball without asking. Keep drinks and food off the approach, because wet or sticky shoes can cause slips. And when a teammate throws a strike, a high five is compulsory.</p>
"""))

ARTICLES.append(dict(
    slug="dodgeball-rules-explained",
    title="Dodgeball rules explained for adult leagues",
    desc="How adult dodgeball leagues play: court and ball setup, the opening rush, outs, catches that bring teammates back, headshot rules and stalling limits.",
    dek="The opening rush, catches, headshots and stalling rules: how grown-up dodgeball keeps the chaos fair.",
    alt="Two dodgeball teams in a gym, one player leaning away from a flying foam ball",
    cat="rules", cat_label="Rules",
    related=["kickball-rules-for-adult-leagues", "flag-football-rules-for-beginners", "how-to-pick-a-team-name"],
    faq=[
        ("Are headshots allowed in adult dodgeball?", "It depends on the league. Many social leagues say a headshot does not make the victim out, and some penalise the thrower if the shot was deliberate or thrown hard. A player who ducks into a ball is usually still out."),
        ("What happens if you catch a dodgeball?", "In most rulebooks, a clean catch puts the thrower out and lets one of your eliminated teammates come back in, usually in the order they went out."),
        ("Can you block a throw with a ball you are holding?", "Usually yes. Blocking with a held ball is legal, but if the ball you are holding gets knocked out of your hands by the throw, you are typically out."),
        ("What kind of balls do adult leagues use?", "Most social leagues use soft foam or rubber-coated foam balls, sometimes called no-sting balls, around 7 to 8.5 inches across, to reduce injuries."),
    ],
    body="""
<p>Dodgeball is gloriously simple: throw balls at the other team, avoid getting hit, and be the last team standing. Adult leagues have kept that spirit but added rules to keep games fair and safe, especially around catches, headshots and players who hold on to balls forever. Rules vary between leagues and organisations more than in most sports, so treat this as a guide to the common approach and read your league's rules before the first game.</p>

<h2>The court and equipment</h2>
<p>Dodgeball is usually played indoors on a basketball or volleyball court split in half by a centre line. Each team has its own half and must stay on it. There is often an attack line a few metres back from the centre line on each side, which matters for the opening rush and sometimes for where you can throw from.</p>
<p>Adult social leagues commonly use six players per side on the court and six balls, though some use more or fewer depending on court size. The balls are typically soft foam or rubber-coated foam, often called no-sting balls, which hurt far less than the rubber playground balls of your childhood.</p>

<h2>Starting a game: the opening rush</h2>
<p>At the start of each game the balls are lined up along the centre line. Players wait behind their own back line, and on the referee's signal both teams sprint forward to grab balls. The usual rule is that each team can only claim the balls on their half of the centre line, or a set number of balls, and anything taken must be brought back behind the attack line before it can be thrown. This stops people firing at point-blank range during the scramble.</p>
<p>The rush is the most injury-prone moment of the game, so many leagues ask players to keep low and avoid diving. If sprinting at full speed towards another adult sprinting at you sounds like a bad idea, it is completely fine to hang back and let a teammate go.</p>

<h2>How you get out</h2>
<div class="table-wrap"><table>
<thead><tr><th>Situation</th><th>Result in most leagues</th></tr></thead>
<tbody>
<tr><td>You are hit by a live thrown ball on the fly</td><td>You are out.</td></tr>
<tr><td>Your throw is caught cleanly by an opponent</td><td>You are out and one of their out players returns.</td></tr>
<tr><td>You block a throw with a held ball and drop your ball</td><td>You are out.</td></tr>
<tr><td>You step over the centre line or out of bounds</td><td>You are out.</td></tr>
<tr><td>You are hit in the head</td><td>Varies: often you stay in, and the thrower may be penalised.</td></tr>
<tr><td>A ball bounces off the floor or wall before hitting you</td><td>Not out; the ball is dead.</td></tr>
</tbody></table></div>
<p>A ball stays live from the moment it leaves the thrower's hand until it touches the floor, a wall, the ceiling, or an object like a basketball hoop. Hits by a dead ball do not count. If a ball hits one player and then another before touching anything, rules differ: some leagues say both are out, others only the first.</p>

<h2>Catches change everything</h2>
<p>Catching is the most powerful move in dodgeball. A clean catch usually does two things at once: it gets the thrower out, and it brings one of your eliminated teammates back onto the court. Most leagues bring players back in the order they were eliminated, so keep an orderly line on the sideline.</p>
<p>A catch only counts if you control the ball before it touches the ground or anything out of bounds. If a ball bounces off a teammate and you catch it before it hits the floor, many rulebooks still count it as a catch and save your teammate as well.</p>

<h2>Headshots and safety</h2>
<p>Headshot rules are where leagues differ most. Common versions include:</p>
<ul>
<li>A headshot does not count as an out, and play continues.</li>
<li>A deliberate or hard headshot puts the thrower out instead.</li>
<li>If the player was ducking, dodging low or otherwise moved their head into the path of the ball, the hit counts as a normal out.</li>
</ul>
<p>Whatever your league's version, aim below the shoulders. It is safer, it is what referees expect, and it keeps the game friendly enough that people come back next season.</p>

<h2>Stalling and the shot clock</h2>
<p>A team holding every ball can freeze the game. To stop that, many leagues use a stalling rule. Typical versions give a team a set number of seconds to throw once it controls all the balls, or require the team with more players to keep attacking. If the count runs out, the balls may be awarded to the other team. Games also usually have a time limit; when time runs out, the team with more players left often wins, or the game is recorded as a draw.</p>

<h2>Beginner strategy</h2>
<div class="box">
<h3>Five habits that keep you in the game</h3>
<ol>
<li>Stay near the back of your half when you do not have a ball; distance buys reaction time.</li>
<li>Hold a ball when you can. It lets you block, and it means the other team has one fewer to throw.</li>
<li>Throw together. Coordinated throws at one target are much harder to dodge or catch.</li>
<li>Watch the thrower's arm, not the ball in their hand.</li>
<li>If a soft lob is coming at you, try to catch it. Catches win games.</li>
</ol>
</div>
<p>Most of all, dodgeball is a game about being ridiculous together. Call your own outs honestly, shake hands at the end, and save the heroics for the story you tell at the bar.</p>
"""))

ARTICLES.append(dict(
    slug="flag-football-rules-for-beginners",
    title="Flag football rules for beginners",
    desc="A beginner's guide to adult flag football rules: team sizes, flag belts, downs and no-run zones, rushing the quarterback, scoring and common penalties.",
    dek="Flags instead of tackles, no-run zones, rushing rules and how scoring works in a typical adult league.",
    alt="A ball carrier running downfield while a defender pulls a yellow flag from their belt",
    cat="rules", cat_label="Rules",
    related=["kickball-rules-for-adult-leagues", "warm-up-routine-for-weekend-athletes", "how-to-be-a-good-rec-league-captain"],
    faq=[
        ("Is there contact in flag football?", "In most recreational leagues, blocking and tackling are not allowed. Incidental contact happens, but deliberate contact, including pushing, holding or stiff-arming, is a penalty."),
        ("Can the quarterback run in flag football?", "In many leagues the quarterback cannot run the ball directly past the line of scrimmage unless there has been a handoff or the defence has rushed. Some leagues allow QB runs freely. It is a key rule to check."),
        ("What happens if my flag falls off by itself?", "In many leagues, if your flag falls off without being pulled, you are down when a defender touches you with one hand, rather than when a flag is pulled."),
        ("What shoes should I wear?", "Molded rubber or plastic cleats are usually fine on grass and turf. Metal cleats are commonly banned. Check your venue's rules, especially on artificial turf."),
    ],
    body="""
<p>Flag football keeps the parts of American football most people enjoy, like the passing, the trick plays and the end-zone celebrations, and removes the tackling. Instead of bringing the ball carrier to the ground, defenders pull a flag from the runner's belt. It is one of the most popular adult rec sports because it rewards speed and teamwork more than size. Rules differ across leagues and organisations, so this guide explains the most common framework and points out the places your league may differ.</p>

<h2>Teams, field and equipment</h2>
<p>Adult flag leagues commonly play five-on-five or seven-on-seven, and some play eight or nine a side on larger fields. Fields are usually shorter and narrower than a regulation football field. A typical setup has two end zones and a midfield line, with "no-run zones" marked a few yards in front of each end zone and the midfield line.</p>
<p>Every player wears a belt with two or three flags attached at the hips (and sometimes the back). The flags must hang freely: tucking them in, tying them or covering them with a loose shirt is a penalty. Most leagues supply a ball, often a slightly smaller size than a full-size football, and require non-metal cleats or athletic shoes.</p>

<h2>Downs and moving the ball</h2>
<p>Instead of needing ten yards for a first down, many flag leagues give the offence a set number of plays, often four, to cross midfield. Once it crosses, it gets another set of plays to score. If it fails, the other team takes over at its own starting spot, not where the ball ended up.</p>
<p>Plays start with a snap from the centre to the quarterback. The quarterback can hand off, pitch or pass. A play ends when the ball carrier's flag is pulled, they step out of bounds, a pass falls incomplete, or they score.</p>
<p><strong>No-run zones</strong> are a signature flag-football rule. In the few yards before midfield and the end zone, the offence has to pass. It is there to stop teams simply bulldozing the last few yards with running plays and to reward good passing.</p>

<h2>Rushing the quarterback</h2>
<p>Without offensive linemen, a rule is needed to give the quarterback time. The most common approach:</p>
<ul>
<li>Defenders who want to rush the passer must start a set distance back from the line of scrimmage, often around seven yards, marked by a cone or the referee.</li>
<li>Only rushers who start from that line can cross the line of scrimmage before the ball is handed off or passed.</li>
<li>Some leagues also use a pass clock (for example a few seconds) instead of, or as well as, a rush.</li>
</ul>
<p>In many leagues the quarterback cannot run the ball straight past the line unless the defence rushes or there has been a handoff. Others let the quarterback run freely. Ask before your first game, because it changes how you defend.</p>

<h2>Scoring</h2>
<div class="table-wrap"><table>
<thead><tr><th>Score</th><th>Typical value</th><th>Notes</th></tr></thead>
<tbody>
<tr><td>Touchdown</td><td>6 points</td><td>The ball carrier crosses the goal line with their flags still on.</td></tr>
<tr><td>Extra point, short</td><td>1 point</td><td>A play from a short distance, often around 5 yards.</td></tr>
<tr><td>Extra point, long</td><td>2 points</td><td>A play from further back, often 10 to 12 yards.</td></tr>
<tr><td>Safety</td><td>2 points</td><td>The ball carrier is downed in their own end zone.</td></tr>
<tr><td>Interception return</td><td>6 points (or 2 on a conversion)</td><td>Leagues differ on whether and how returns score.</td></tr>
</tbody></table></div>
<p>Kickoffs and punts are usually replaced by simply giving the ball to the other team at a set spot. Some leagues allow an announced punt where the ball is just moved.</p>

<h2>Common penalties</h2>
<ul>
<li><strong>Flag guarding:</strong> using your hands, arms or the ball to stop a defender reaching your flag.</li>
<li><strong>Contact:</strong> blocking, holding, pushing or tackling. Screening by simply standing in a route is often legal; initiating contact is not.</li>
<li><strong>Offside or early rush:</strong> crossing the line of scrimmage before the snap, or rushing from too close.</li>
<li><strong>Pass interference:</strong> contact with a receiver (or defender) that stops them catching the ball.</li>
<li><strong>Illegal flag belt:</strong> flags tucked, tied or missing at the snap.</li>
<li><strong>Stripping:</strong> trying to take the ball out of the carrier's hands.</li>
</ul>

<h2>Tips for your first season</h2>
<p>On defence, aim for the flag, not the player: watch the runner's hips, stay low, and reach for the flag as they pass. Chasing a player from behind rarely works; cutting off their angle does. On offence, run crisp routes and look back for the ball early. Short passes that move the chains are more reliable than long bombs. Warm up properly before kickoff, because quick changes of direction are hard on cold hamstrings, and our <a href="/articles/warm-up-routine-for-weekend-athletes/">warm-up routine</a> is a good start. Finally, learn your league's no-run zones and rushing rules before the first game, because they decide more drives than any trick play.</p>
"""))

ARTICLES.append(dict(
    slug="how-to-start-a-rec-league",
    title="How to start a rec league from scratch",
    desc="A practical, step-by-step plan for starting an adult rec league: choosing a sport and format, booking a venue, setting fees, rules, schedules and keeping players coming back.",
    dek="From group chat to fixture list: choosing a format, booking a venue, writing rules and keeping everyone coming back.",
    alt="An organiser with a clipboard next to a season calendar, cones, a whistle and a trophy",
    cat="leagues", cat_label="Leagues",
    related=["how-to-find-an-adult-rec-league", "how-to-be-a-good-rec-league-captain", "how-to-pick-a-team-name"],
    faq=[
        ("How many teams do I need to start a league?", "Four teams is a practical minimum for a varied season. With four, every team plays every other team in three weeks, so a six-week season can fit a second round plus playoffs. Fewer than four and it tends to feel repetitive; more than eight and scheduling gets harder for a first season."),
        ("Do I need insurance to run a rec league?", "Many venues require event organisers to carry liability insurance or to be covered by an organisation that does. Rules differ by location, so ask the venue and talk to a qualified insurance professional before you take money from players."),
        ("Should I charge players?", "If you are paying for a venue, equipment or referees, collecting a fee upfront is the fairest way to share costs and makes people more likely to show up. Keep records of what you collected and spent."),
        ("What if a team keeps forfeiting?", "Set a forfeit policy before the season starts, for example a recorded loss and a warning, with removal after a set number of forfeits. Having it written down makes the conversation much easier."),
    ],
    body="""
<p>Sometimes the league you want does not exist. Maybe there is no cornhole night near you, or the local kickball league is too competitive, or your group of friends just wants a regular game with a few more teams. Starting a small rec league is very doable. It mainly takes organisation, a clear set of rules and someone willing to send the reminder texts. Here is a step-by-step plan for a first season.</p>

<h2>Step 1: Decide what you are running</h2>
<p>Before booking anything, answer four questions. Your answers shape every later decision.</p>
<ul>
<li><strong>Which sport?</strong> Low-equipment, low-space sports like cornhole, bowling, kickball and pickleball are the easiest first leagues. Sports needing referees, lights and large fields are harder.</li>
<li><strong>Who is it for?</strong> Social beginners, experienced players, a single workplace, a neighbourhood? A clear audience makes recruiting easier.</li>
<li><strong>What format?</strong> Round robin (everyone plays everyone), a ladder (players challenge those just above them), or a season with playoffs.</li>
<li><strong>How long?</strong> A short first season of six to eight weeks is easier to commit to and easier to fix if something goes wrong.</li>
</ul>

<h2>Step 2: Find a venue and a time slot</h2>
<p>The venue decides most of your costs and logistics. Options include public parks (many cities require a permit for organised use of fields), school or community centre gyms, bowling centres, and bars or breweries with outdoor space. Bars that want a busy weeknight are often happy to host cornhole or trivia-style leagues with little or no fee.</p>
<p>When you contact a venue, ask about the cost per session, what equipment they provide, whether they require liability insurance, what happens in bad weather, and whether there is a minimum number of weeks. Get the agreement in writing, even if it is just an email.</p>

<h2>Step 3: Work out the money</h2>
<p>Add up venue costs, equipment, shirts if you want them, any referee fees, insurance and a small buffer for surprises. Divide by the number of players or teams you expect. It is better to set a fee that covers everything than to ask for more mid-season. Collect payment before the season starts, use a method that creates a record, and keep a simple spreadsheet of money in and money out. Transparency keeps friendships intact.</p>

<h2>Step 4: Write short, clear rules</h2>
<p>You do not need a 40-page rulebook. You do need a one-page document everyone reads before the first game. Start from the official or widely used rules for your sport, then list your house rules clearly. Cover:</p>
<div class="box">
<h3>One-page rules checklist</h3>
<ul class="checklist">
<li>Game length and how a winner is decided</li>
<li>Team size, minimum players and coed ratios if relevant</li>
<li>Substitutes: who can play for a team that is short</li>
<li>Forfeits: deadline to cancel, and what a forfeit counts as</li>
<li>Weather or venue cancellation policy</li>
<li>Standings: points for a win, draw and loss; tiebreakers</li>
<li>Conduct: respect for opponents, officials and the venue</li>
<li>Safety: footwear, equipment and alcohol expectations</li>
</ul>
</div>

<h2>Step 5: Recruit teams and free agents</h2>
<p>Start with your own network: friends, coworkers, neighbours and their friends. Post in local social media groups and on community noticeboards. Offer both full-team and individual sign-ups; individuals who do not know anyone are often the most enthusiastic players, and you can group them into teams. Our guide to <a href="/articles/joining-a-league-as-a-free-agent/">joining as a free agent</a> explains what those players expect.</p>
<p>Ask each team to name a captain who is responsible for communication and making sure the team shows up. It saves you from messaging forty people individually.</p>

<h2>Step 6: Build the schedule</h2>
<p>For a round robin with an even number of teams, the classic "circle method" works well: fix one team in place and rotate the rest one position each week. With an odd number, add a "bye" so one team rests each week. Keep the schedule in a shared document or spreadsheet, and publish standings weekly. Here is a sample four-team, six-week plan:</p>
<div class="table-wrap"><table>
<thead><tr><th>Week</th><th>Game 1</th><th>Game 2</th></tr></thead>
<tbody>
<tr><td>1</td><td>A vs B</td><td>C vs D</td></tr>
<tr><td>2</td><td>A vs C</td><td>B vs D</td></tr>
<tr><td>3</td><td>A vs D</td><td>B vs C</td></tr>
<tr><td>4</td><td>B vs A</td><td>D vs C</td></tr>
<tr><td>5</td><td>C vs A</td><td>D vs B</td></tr>
<tr><td>6</td><td>Playoffs: 1st vs 4th, 2nd vs 3rd, then final</td><td></td></tr>
</tbody></table></div>

<h2>Step 7: Run game day and keep people coming back</h2>
<p>Arrive early, set up, and have spare equipment. Send a reminder the day before each game with the time, place and any changes. Our printable <a href="/game-day-checklist/">game-day checklist</a> is handy for this. After the game, post results quickly and thank the venue.</p>
<p>What keeps players coming back is rarely the competition. It is feeling welcome. Learn names, introduce new players, organise a social after a couple of games, and celebrate the end of the season with something, even if the trophy is a spray-painted bowling pin. At the end, ask players what to change, then open registration for season two while the enthusiasm is still high.</p>
"""))
