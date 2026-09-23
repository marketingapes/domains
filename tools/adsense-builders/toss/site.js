/* Toss Sports: team-name generator + article filter. No network calls. */
(function () {
  var pick = function (a) { return a[Math.floor(Math.random() * a.length)]; };

  var PUNS = {
    cornhole: ["Bag to the Future", "Holey Rollers", "Sack Attack", "Cornucopia", "The Airmailers", "Board Meeting", "Hole-y Moly", "Four Bagger Club", "Cornfused", "Bags of Fun"],
    kickball: ["Kick It Real Good", "Boredom Busters", "Red Rubber Revival", "Base Invaders", "The Pitch Slappers", "Kicking and Screaming", "Sole Mates", "Foul Play", "Unkickable", "Rolling Thunder"],
    pickleball: ["Dill With It", "Kitchen Violators", "In a Pickle", "Big Dill Energy", "Dinks on Me", "Brine Time", "Net Gains", "Relish the Moment", "Pickled Punchers", "Third Shot Drop Squad"],
    bowling: ["Split Happens", "Gutter Than Ever", "Pin Pals", "Spare Me", "Bowled Over", "Alley Cats", "Strike a Pose", "Lane Changers", "The Ten Pin Theory", "Ball Hogs"],
    dodgeball: ["Dodge This", "Duck Season", "The Dodge Fathers", "Ball Street Journal", "Hit or Miss", "Duck and Cover", "Sting Operation", "Headshot Hesitators", "Catch Me If You Can", "Evasive Maneuvers"],
    flag: ["Flag on the Play", "Red Flags", "Hail Mary Had a Plan", "Flagrant Fouls", "End Zone Enthusiasts", "The Snap Chats", "Flag Me Maybe", "Pull Request", "Blitz Please", "Rush Hour"],
    softball: ["Batter Up Buttercups", "Bunt Intended", "Diamond Hands", "Left Field Legends", "The Big Hitters", "Off Base", "Pitch Perfect", "Can of Corn", "Swing and a Miss", "Bat Attitudes"],
    volleyball: ["Set to Kill", "Block Party", "Dig It", "Net Results", "Sets on the Beach", "Bump Set Spike", "Ace of Bases", "Serves You Right", "Ace Ventures", "Setter Than Ever"],
    any: ["Game of Throws", "Couch to Court", "The Participation Trophies", "Weekend Warriors", "Past Our Prime Time", "Pulled Hamstrings", "Aches and Pains", "Here for the Snacks", "Team Name Pending", "Nacho Average Team"]
  };
  var ADJ = {
    fierce: ["Thunder", "Iron", "Midnight", "Rowdy", "Rogue", "Atomic", "Blazing", "Wild", "Stealth", "Relentless", "Crimson", "Electric"],
    wholesome: ["Happy", "Sunny", "Friendly", "Cozy", "Lucky", "Golden", "Cheerful", "Plucky", "Merry", "Chill", "Good Vibe", "Sunday"],
    pun: ["Mildly Athletic", "Semi-Pro", "Totally Legit", "Recreational", "Surprisingly Decent", "Well-Hydrated", "Fashionably Late", "Overly Confident", "Slightly Sore", "Emotionally Invested"]
  };
  var NOUN = {
    fierce: ["Wolves", "Hornets", "Titans", "Vipers", "Raptors", "Storm", "Cobras", "Outlaws", "Hammers", "Bandits", "Sharks", "Knights"],
    wholesome: ["Otters", "Pancakes", "Puffins", "Sunflowers", "Pals", "Muffins", "Penguins", "Neighbors", "Hedgehogs", "Llamas", "Dumplings", "Ducklings"],
    pun: ["Benchwarmers", "Snack Squad", "Hydration Station", "Stretchers", "Ice Pack Club", "Fan Favorites", "Rookies", "Underdogs", "Almost Athletes", "Nap Champions"]
  };
  var SPORTNOUN = { cornhole: "Baggers", kickball: "Kickers", pickleball: "Dinkers", bowling: "Rollers", dodgeball: "Dodgers", flag: "Flaggers", softball: "Sluggers", volleyball: "Spikers", any: "Players" };

  function tidy(s) { return s.replace(/[^A-Za-z0-9 '\-]/g, "").trim().replace(/\b\w/g, function (c) { return c.toUpperCase(); }); }

  function names(sport, vibe, word) {
    var out = [], tries = 0;
    var puns = (PUNS[sport] || PUNS.any).concat(sport === "any" ? [] : PUNS.any.slice(0, 3));
    while (out.length < 5 && tries++ < 60) {
      var r = Math.random(), n;
      if (word && out.length < 2) {
        n = pick(["The " + word + " " + pick(NOUN[vibe]), word + " " + SPORTNOUN[sport], pick(ADJ[vibe]) + " " + word, word + " " + pick(NOUN[vibe])]);
      } else if (vibe === "pun" && r < 0.7) {
        n = pick(puns);
      } else if (r < 0.45) {
        n = "The " + pick(ADJ[vibe]) + " " + pick(NOUN[vibe]);
      } else if (r < 0.75) {
        n = pick(ADJ[vibe]) + " " + SPORTNOUN[sport];
      } else {
        n = vibe === "pun" ? pick(puns) : "The " + pick(NOUN[vibe]);
      }
      if (out.indexOf(n) === -1) out.push(n);
    }
    return out;
  }

  var go = document.getElementById("gen-go");
  if (go) {
    var list = document.getElementById("gen-out"), note = document.getElementById("gen-note");
    var run = function () {
      var sport = document.getElementById("gen-sport").value;
      var v = document.querySelector('input[name="vibe"]:checked');
      var word = tidy(document.getElementById("gen-word").value || "");
      list.innerHTML = ""; note.textContent = "";
      names(sport, v ? v.value : "pun", word).forEach(function (n) {
        var li = document.createElement("li"), b = document.createElement("button");
        b.type = "button"; b.textContent = n; b.setAttribute("aria-label", "Copy team name " + n);
        b.addEventListener("click", function () {
          var done = function () { note.textContent = "Copied “" + n + "”. Go tell the group chat."; };
          if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(n).then(done, function () { note.textContent = n; });
          else note.textContent = "Your pick: " + n;
        });
        li.appendChild(b); list.appendChild(li);
      });
      go.textContent = "Shuffle again";
    };
    go.addEventListener("click", run);
    run();
  }

  var filters = document.querySelectorAll("[data-filter]");
  if (filters.length) {
    filters.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var f = btn.getAttribute("data-filter");
        filters.forEach(function (o) { var on = o === btn; o.classList.toggle("is-on", on); o.setAttribute("aria-pressed", on ? "true" : "false"); });
        document.querySelectorAll("#art-grid .card-wrap").forEach(function (c) { c.hidden = f !== "all" && c.getAttribute("data-cat") !== f; });
      });
    });
  }
})();
