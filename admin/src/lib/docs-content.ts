/**
 * User-guide content.
 *
 * Kept as typed data rather than MDX so the guide stays searchable, renders
 * inside the existing shell, and cannot drift into a second styling system.
 * `audience` decides who sees a section — members should not be shown CMS
 * instructions they have no access to.
 */

export type DocAudience = "everyone" | "member" | "staff";

export type DocSection = {
  slug: string;
  title: string;
  audience: DocAudience;
  summary: string;
  blocks: DocBlock[];
};

export type DocBlock =
  | { kind: "p"; text: string }
  | { kind: "steps"; items: string[] }
  | { kind: "list"; items: string[] }
  | { kind: "note"; text: string };

export const DOC_SECTIONS: DocSection[] = [
  {
    slug: "install",
    title: "Install the console on your phone",
    audience: "everyone",
    summary: "Add CTR to your home screen so announcements arrive as notifications.",
    blocks: [
      {
        kind: "p",
        text: "The console is a web app — there is nothing to download from an app store. Installing it puts an icon on your home screen, opens it full-screen without browser chrome, and is required on iPhone before notifications will work at all.",
      },
      {
        kind: "steps",
        items: [
          "On Android (Chrome): open the console, then tap the Install banner, or the browser menu and 'Add to Home screen'.",
          "On iPhone (Safari): tap the Share button, scroll down, then tap 'Add to Home Screen'.",
          "Open the console from the new home-screen icon, not from the browser.",
          "Go to Account and turn on notifications for that device.",
        ],
      },
      {
        kind: "note",
        text: "Notifications are granted per device. Turning them on for your phone does not turn them on for your laptop — repeat this on every device you want alerts on.",
      },
    ],
  },
  {
    slug: "signing-in",
    title: "Signing in and passwords",
    audience: "everyone",
    summary: "How accounts are created, and what to do when you are locked out.",
    blocks: [
      {
        kind: "p",
        text: "Accounts are created by invitation — there is no public sign-up. You will get an email with a link to set your own password; that link works once and expires after 14 days.",
      },
      {
        kind: "list",
        items: [
          "Forgot your password? Use the 'Forgot password?' link on the sign-in page. The reset link lasts one hour.",
          "Changing your password signs out every other device you are signed in on.",
          "After ten failed attempts an account locks. A team admin (for members) or a Super Admin (for staff) can restore access.",
        ],
      },
      {
        kind: "note",
        text: "The reset page always says the same thing whether or not the address has an account. That is deliberate — it stops outsiders using the form to work out who is on the team.",
      },
    ],
  },
  {
    slug: "availability",
    title: "Confirming your availability",
    audience: "member",
    summary: "Tell your team whether you will be at each race weekend.",
    blocks: [
      {
        kind: "steps",
        items: [
          "Open Schedule from the bottom bar.",
          "Find the race weekend under Upcoming.",
          "Tap Going, Maybe or Can't. Your answer saves immediately.",
          "Change your mind any time by tapping a different option.",
        ],
      },
      {
        kind: "p",
        text: "Your team admin sees the running headcount for the next three weekends on their Roster page. Only your own team sees your answer.",
      },
    ],
  },
  {
    slug: "roster",
    title: "Managing your team roster",
    audience: "member",
    summary: "For team admins: inviting crew, bulk imports and removing access.",
    blocks: [
      {
        kind: "p",
        text: "Team admins manage their own crew from the Roster tab. You can only see and change your own team.",
      },
      {
        kind: "steps",
        items: [
          "To invite one person, fill in the Invite someone form. They get an email to set their password.",
          "To invite many, prepare a CSV with columns: name, email, and optionally role and position. Upload it under Import & export. Up to 100 rows at a time.",
          "To remove access, use Deactivate. That signs them out of every device immediately — it does not delete their history.",
          "To withdraw an invitation that has not been accepted yet, use Withdraw.",
        ],
      },
      {
        kind: "note",
        text: "You can grant Team member or Team admin. Only CTR staff can create Officials, who work across all teams.",
      },
    ],
  },
  {
    slug: "announcements",
    title: "Sending announcements",
    audience: "staff",
    summary: "Broadcast a notification, and choose who receives it.",
    blocks: [
      {
        kind: "steps",
        items: [
          "Go to Announcements in the CMS sidebar.",
          "Write a short title and message — both appear in the notification itself.",
          "Optionally add a link, which opens when the notification is tapped.",
          "Choose the audience: everyone, members only, staff only, or fans only.",
          "Send. The page reports how many devices were reached.",
        ],
      },
      {
        kind: "p",
        text: "The report separates sent, failed and skipped. 'Skipped' means the device was outside your chosen audience, or its owner turned that category off in their own settings — it is not a delivery problem.",
      },
      {
        kind: "note",
        text: "Announcements go to devices, not people. Someone who has never enabled notifications on any device will not receive one, however they are targeted.",
      },
    ],
  },
  {
    slug: "members-staff",
    title: "Managing members as staff",
    audience: "staff",
    summary: "Seeding a team's first admin, officials, and the full export.",
    blocks: [
      {
        kind: "p",
        text: "The Members page lists everyone across every team. Use it to seed a new team's first admin — after that, they build out their own roster themselves.",
      },
      {
        kind: "list",
        items: [
          "Officials are organisation-wide and are not attached to a team.",
          "Team roles require a team to be chosen.",
          "Export CSV downloads every member, including phone numbers. It is recorded in the audit log.",
        ],
      },
    ],
  },
  {
    slug: "data",
    title: "Getting data in and out",
    audience: "everyone",
    summary: "CSV exports, imports, and what opens them safely.",
    blocks: [
      {
        kind: "list",
        items: [
          "Team admins: Roster → Download roster CSV gives you the crew list with an availability column per upcoming round.",
          "Staff: Members → Export CSV gives you every member across all teams.",
          "Exports are UTF-8 with a byte-order mark, so names with accents open correctly in Excel.",
        ],
      },
      {
        kind: "note",
        text: "Cells that begin with =, +, - or @ are prefixed with an apostrophe in exports. That stops a spreadsheet treating someone's name as a formula, and is expected — delete the apostrophe if you need the raw text.",
      },
    ],
  },
];

export function sectionsFor(audience: "member" | "staff"): DocSection[] {
  return DOC_SECTIONS.filter((s) => s.audience === "everyone" || s.audience === audience);
}
