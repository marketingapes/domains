#!/usr/bin/env python3
"""Write <lane>/copy.md for the 5 Phillips lanes, enforcing platform length limits."""
import os

HERE = os.path.dirname(os.path.abspath(__file__))
BTL, NIL = "Best Tort Lawyers", "Nearest Injury Lawyers"


def surv_tail(brand):
    return ("You never need to describe what happened, and you can skip any question or stop anytime. "
            "Sofia, our AI intake guide, asks a few general questions to see if you may potentially qualify for review "
            "by an independent law firm. %s is a matching service, not a law firm. No legal advice. "
            "No result is guaranteed. Free, confidential support 24/7: RAINN 1-800-656-4673." % brand)


MVA_TAIL = ("Sofia, our AI intake guide, asks a few short questions to help identify whether you may potentially "
            "qualify for review by an independent law firm. Nearest Injury Lawyers is a matching service, not a law firm. "
            "No legal advice. No result is guaranteed.")

SURV_COMMON_H = ["You Deserve to Be Heard", "Confidential. At Your Pace.", "Free, Private First Step",
                 "No Need to Share Details", "Skip Any Question, Anytime", "Your Voice Matters", "Even Years Later"]
SURV_COMMON_D = ["A few general questions. You never have to describe what happened. Stop anytime.",
                 "See if you may potentially qualify for review by an independent law firm.",
                 "Attorney advertising. Matching service, not a law firm. No legal advice or guarantee."]


def rideshare(brand):
    return dict(
        headlines=["You deserve to be heard", "Confidential. At your pace.", "Riders deserve to be heard"],
        primary=["For riders who experienced sexual misconduct by a rideshare driver: you deserve to be heard.",
                 "Confidential. At your pace. A few general questions, and you can stop anytime.",
                 "Riders deserve to feel safe — and to be heard. When you're ready, the first step is short and private."],
        tail=surv_tail(brand),
        description="Confidential. Not a law firm. No legal advice.",
        rsa_h=SURV_COMMON_H + ["Rideshare Misconduct Claims", "Riders Deserve to Be Heard", brand],
        rsa_d=["For riders who experienced misconduct by a rideshare driver in the U.S."] + SURV_COMMON_D,
    )


LANES = {
    "nil-mva-pi": dict(
        brand=NIL,
        headlines=["Hurt in a crash? See your options", "Car accident? Know your next step", "Check your options in 2 minutes"],
        primary=["Hurt in a vehicle accident? See your options in about 2 minutes — in any of the 50 states.",
                 "Before you call a law firm, start with Sofia. About 2 minutes, from anywhere in the U.S.",
                 "Deadlines vary by state, so it helps not to wait. Check your options after a crash — free and private."],
        tail=MVA_TAIL,
        description="Free first step. Not a law firm. No legal advice.",
        rsa_h=["Hurt in a Car Accident?", "Check Your Options Today", "Takes About 2 Minutes", "Available in All 50 States",
               "Free, Private First Step", "Start With Sofia, AI Intake", "Car, Truck or Motorcycle Crash",
               "No Cost to Check Your Options", "Deadlines Vary by State", NIL],
        rsa_d=["Answer a few short questions to see if you may potentially qualify for review.",
               "Car, truck, motorcycle, rideshare or pedestrian accidents. In any of the 50 states.",
               "Sofia, our AI intake guide, helps identify a next step. Free. About 2 minutes.",
               "Attorney advertising. Matching service, not a law firm. No legal advice or guarantee."],
    ),
    "btl-sex-abuse-la-county": dict(
        brand=BTL,
        headlines=["You deserve to be heard", "Confidential. At your pace.", "Laws in California changed"],
        primary=["For adults who experienced abuse as children in LA County facilities or programs: you deserve to be heard.",
                 "California law changed. Some adults abused as children in LA County settings may now have options.",
                 "Your voice matters — even years later. When you're ready, the first step is short, private and free."],
        tail=surv_tail(BTL),
        description="Confidential. Not a law firm. No legal advice.",
        rsa_h=SURV_COMMON_H + ["California Laws Changed", "Juvenile Hall & Foster Care", BTL],
        rsa_d=["For adults harmed as children in LA County facilities, schools or programs."] + SURV_COMMON_D,
    ),
    "btl-sex-abuse-ca-womens-prisons": dict(
        brand=BTL,
        headlines=["You deserve to be heard", "Confidential. At your pace.", "Your voice matters, even years later"],
        primary=["For women who experienced sexual misconduct by staff in a California women's facility: you deserve to be heard.",
                 "Confidential. At your pace. A few general questions, and you can stop anytime.",
                 "Your voice matters — even years later. When you're ready, the first step is short, private and free."],
        tail=surv_tail(BTL),
        description="Confidential. Not a law firm. No legal advice.",
        rsa_h=SURV_COMMON_H + ["CA Women's Facilities", "Staff Misconduct Claims", BTL],
        rsa_d=["For women who experienced staff misconduct in a California women's facility."] + SURV_COMMON_D,
    ),
    "btl-rideshare-sex-abuse": dict(brand=BTL, **rideshare(BTL)),
    "nil-rideshare-sex-abuse": dict(brand=NIL, **rideshare(NIL)),
}

NOTES = {
    "nil-mva-pi": "Urgency + clarity, nationwide. No fear tactics, no dollar amounts, no guarantees.",
    "btl-rideshare-sex-abuse": "EXPERIMENT: copy is identical to nil-rideshare-sex-abuse except the brand name. Only the audience should differ.",
    "nil-rideshare-sex-abuse": "EXPERIMENT: copy is identical to btl-rideshare-sex-abuse except the brand name. Only the audience should differ.",
}
SURV_NOTE = ("Trauma-informed: no graphic terms, never asks what happened, no second-person assertion that the reader was harmed "
             "(Meta personal-attributes policy) — lines are framed 'For adults/women/riders who…'. Google assets avoid the word "
             "'sexual' entirely to stay clear of sensitive-content review. Uber/Lyft names are NOT used (trademark policy); "
             "add only after attorney + platform trademark review.")


def main():
    for lane, c in LANES.items():
        errs = []
        for h in c["headlines"]:
            if len(h) > 40: errs.append("headline>40: " + h)
        for p in c["primary"]:
            if len(p) > 125: errs.append("primary first line>125 (%d): %s" % (len(p), p))
        for h in c["rsa_h"]:
            if len(h) > 30: errs.append("rsa headline>30: " + h)
        for d in c["rsa_d"]:
            if len(d) > 90: errs.append("rsa desc>90 (%d): %s" % (len(d), d))
        assert len(c["rsa_h"]) == 10 and len(c["rsa_d"]) == 4, lane
        if errs:
            raise SystemExit("\n".join([lane] + errs))
        survivor = lane != "nil-mva-pi"
        out = ["# %s — ad copy" % lane, "",
               "Brand: **%s**. Status: **pending-attorney-review** (all copy). Do not name the receiving firm." % c["brand"],
               "", "> " + NOTES.get(lane, ""), ""]
        if survivor:
            out += ["> " + SURV_NOTE, ""]
        out += ["## Meta", "", "### Headlines (≤40 chars)", ""]
        out += ["%d. %s  _(%d)_" % (i + 1, h, len(h)) for i, h in enumerate(c["headlines"])]
        out += ["", "### Primary texts (first line ≤125 chars; same body follows each)", ""]
        for i, p in enumerate(c["primary"]):
            out += ["**%d.** _(first line %d chars)_" % (i + 1, len(p)), "", "```", p, "", c["tail"], "```", ""]
        out += ["### Description", "", c["description"], "",
                "### CTA button", "", "**Learn More** (not Get Quote — a quote implies a price/value, which is off-message for a free matching step).", "",
                "### Disclaimer band on every image", "", "`Attorney advertising. Not a law firm. No legal advice. Results not guaranteed.` — pending-attorney-review.", "",
                "## Google RSA", "", "### Headlines (≤30 chars)", ""]
        out += ["%d. %s  _(%d)_" % (i + 1, h, len(h)) for i, h in enumerate(c["rsa_h"])]
        out += ["", "### Descriptions (≤90 chars)", ""]
        out += ["%d. %s  _(%d)_" % (i + 1, d, len(d)) for i, d in enumerate(c["rsa_d"])]
        out += ["", "Pin the compliance description (#%d) to position 2 so it always serves." % len(c["rsa_d"]), ""]
        open(os.path.join(HERE, lane, "copy.md"), "w").write("\n".join(out))
        print("ok", lane)


if __name__ == "__main__":
    main()
