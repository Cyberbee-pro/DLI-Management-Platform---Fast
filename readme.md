F.A.S.T. DLI Platform 

📖 Table of Contents

    About the Project

    Gamification & Economy

    Core Workflows

        🛡️ Admin Dashboard

        🧑‍💻 Member Dashboard

    Automated Integrations

    Setup & Installation

🎯 About the Project

This platform is built to incentivize club members to contribute to open-source and internal club projects. By completing tasks, resolving issues, and meeting deadlines, members earn points. These points determine their club rank and can be redeemed for high-value educational courses (like NVIDIA DLI).
🏆 Gamification & Economy

    Ranks: Members progress through tiers based on accumulated points: Beginner ➔ Intermediate ➔ Pro ➔ Elite ➔ Legendary.

    Rank Decay: Inactive members automatically decay in rank (e.g., Elite to Pro) after a set period of inactivity.

    Hot Bounties: Urgent tasks feature a 1.5x or 2.x point multiplier to encourage rapid resolution.

    Penalty Avoidance: Members facing a missed deadline (tracked by a Grace Period UI timer) can transfer tasks to others to avoid negative point penalties.

⚙️ Core Workflows
🛡️ Admin Dashboard

The command center for super admins and project leads to manage the club's operations, users, and rewards.
📋 Task Board

    Create, edit, and allocate difficulty-based points to tasks.

    Bulk upload tasks via CSV/JSON.

    Toggle "Hot Bounties" for urgent tasks.

    Auto-import issues from linked Git repositories.

👥 User Management

    RBAC (Role-Based Access Control): Create sub-roles like "Project Lead" or "Mentor" with scoped permissions (e.g., can approve tasks for their team, but cannot ban users).

    Approve points, assign/transfer tasks, and manage course approvals.

    Suspend, ban, or send notices to members.

    Trigger automated reminders (Email/Discord/Slack) for inactive users or looming deadlines.

    Trigger manual or automated rank decay for inactive members.

📊 Analytics & UI

    Audit Log: Immutable, read-only log tracking exactly who approved points, assigned tasks, or redeemed courses to prevent rogue distribution.

    Graph Views: * Course claim & activity metrics.

        Member contribution and point usage breakdowns.

        Burn-Down Charts: Visual tracking of club productivity (tasks created vs. completed).

        Member "Health" Overview: Quick-glance UI highlighting top contributors for promotion, and low-performing/negative-point members for intervention.

📚 Course Database

    Manage the catalog of available NVIDIA DLI courses.

    Set point costs and baseline difficulty requirements for each course.

🧑‍💻 Member Dashboard

The central hub for club members to find work, track their progress, and redeem rewards.
📋 Task Board

    Browse, filter (by tag, project, difficulty), and claim open tasks.

    Easily identify "Hot Bounties" for bonus points.

💰 Tasks & Points

    Submit Proof of Work (e.g., GitHub PR links, Drive links) for Admin approval.

    Initiate or accept task transfer requests to collaborate or avoid negative points.

    Grace Period Indicator: A visual countdown timer showing exactly when negative points will hit for missed deadlines.

    Rank Progress Bar: Real-time visual tracking of points needed to hit the next tier.

📚 Courses Catalog

    Browse the available NVIDIA DLI library.

    Check point costs and redeem points to request course access.

    Track Admin approval status for requested courses.

📊 Analytics & UI

    Personal point earnings over time vs. missed deadlines.

    Club Leaderboard to see top contributors and current standings.

    Comprehensive personal activity log.

🤖 Automated Integrations

    GitHub / GitLab Webhooks: Link specific club repository branches to the platform. When an Admin merges a PR, the system catches the webhook and auto-approves the associated points—no manual Admin entry required.

    Personal Git Linking: Members can link their personal GitHub/GitLab accounts so the system automatically flags their PR submissions to tracked club repos.

    Smart Notifications: Opt-in automated alerts via Discord, Slack, or Email for expiring deadlines, new Hot Bounties, point approvals, and inactivity reminders.

💻 Setup & Installation

(Standard boilerplate to be filled in based on your tech stack)
Bash

# Clone the repository
git clone https://github.com/yourusername/fast-dli-platform.git

# Navigate into the project directory
cd fast-dli-platform

# Install dependencies
npm install  # or yarn install / pip install requirements.txt

# Set up environment variables
cp .env.example .env

# Run the development server
npm run dev  # or your respective start command