"""
Inserts a handful of fictitious demo leads for the first admin user.
Run: python seed_test_leads.py

All data below is SYNTHETIC and for demonstration only.
Do NOT use real prospect data in seed scripts.
"""

import asyncio
import aiosqlite
import logging
import sys
import os
from datetime import date
import json

sys.path.insert(0, os.path.dirname(__file__))
from database import DB_PATH

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Fictitious demo companies — Acme-style placeholders only.
TEST_LEADS = [
    {
        "name": "Acme Renovations Ltd",
        "website": "www.acme-renovations.example",
        "city": "Springfield",
        "industry": "Home Renovation",
        "phone": "+1 555 010 0001",
        "digital_score": 45,
        "opportunity_level": "medium",
        "redes_sociales": False,
        "captacion_leads": False,
        "email_marketing": False,
        "video_contenido": False,
        "seo_info": False,
        "hooks": json.dumps([
            "Strong local reviews but almost no social presence — likely losing ~30% of inbound interest.",
            "No lead-capture system on the site; web traffic is not being converted.",
            "How are you currently turning website visits into quote requests?"
        ]),
        "opening_lines": json.dumps([
            "Hi [NAME], this is [YOUR NAME] from [YOUR COMPANY]. I noticed Acme Renovations has great reviews but little social presence. I think we can help you capture more clients there.",
            "Hello [NAME], we work with several renovation firms helping them generate quotes automatically online. Is now a good time?",
            "Hi [NAME], you completed a big project recently — how are you generating the next one?"
        ]),
        "opportunity_analysis": "Weak digital presence but solid local reputation. Clear opportunity in online lead capture and quote automation."
    },
    {
        "name": "Globex Construction Co",
        "website": "www.globex-construction.example",
        "city": "Riverside",
        "industry": "Residential Construction",
        "phone": "+1 555 010 0002",
        "digital_score": 28,
        "opportunity_level": "high",
        "redes_sociales": False,
        "captacion_leads": False,
        "email_marketing": False,
        "video_contenido": False,
        "seo_info": False,
        "hooks": json.dumps([
            "Construction firms with a basic website typically lose ~40% of opportunities to a missing digital presence.",
            "No email marketing means every lead that doesn't close simply disappears.",
            "Do you get inbound inquiries you struggle to convert into quotes?"
        ]),
        "opening_lines": json.dumps([
            "Hi [NAME], this is [YOUR NAME] from [YOUR COMPANY]. We help construction firms capture and convert more clients. Got two minutes?",
            "Hello [NAME], Globex has less online presence than its competitors — I think we have something relevant for you.",
            "Hi [NAME], what are you doing right now to generate new clients each month?"
        ]),
        "opportunity_analysis": "Very low digital presence (dated site, no social, no email). Maximum opportunity for lead capture and automation."
    },
    {
        "name": "Initech Interiors",
        "website": None,
        "city": "Lakeview",
        "industry": "Interior Remodeling",
        "phone": "+1 555 010 0003",
        "digital_score": 12,
        "opportunity_level": "high",
        "redes_sociales": False,
        "captacion_leads": False,
        "email_marketing": False,
        "video_contenido": False,
        "seo_info": False,
        "hooks": json.dumps([
            "Remodeling firms with no website miss up to 60% of inquiries from local search.",
            "Do you have any system for collecting online quote requests, or is everything by phone?",
            "Most firms like yours win clients only by word of mouth — that caps growth significantly."
        ]),
        "opening_lines": json.dumps([
            "Hi [NAME], this is [YOUR NAME] from [YOUR COMPANY]. I'm reaching out to busy remodelers who want to grow further. Sound familiar?",
            "Hello [NAME], Initech has plenty of volume but no online presence. We can help you capture more without extra effort from your team.",
            "Is this [NAME]? Calling from [YOUR COMPANY]. We help remodelers automate client acquisition. Got 5 minutes?"
        ]),
        "opportunity_analysis": "No digital presence at all. Huge growth potential via online acquisition and quote automation."
    },
    {
        "name": "Umbrella Builders Inc",
        "website": "www.umbrella-builders.example",
        "city": "Hill Valley",
        "industry": "New Build & Renovation",
        "phone": "+1 555 010 0004",
        "digital_score": 56,
        "opportunity_level": "medium",
        "redes_sociales": True,
        "captacion_leads": False,
        "email_marketing": False,
        "video_contenido": False,
        "seo_info": True,
        "hooks": json.dumps([
            "Good local SEO but no lead-capture system — traffic isn't converting.",
            "Active on social but no clear strategy for converting it into quote requests.",
            "Are you using a CRM, or is everything manual when an inquiry comes in?"
        ]),
        "opening_lines": json.dumps([
            "Hi [NAME], this is [YOUR COMPANY]. I reviewed Umbrella Builders — you have good traffic but it's leaking at conversion. Can we talk briefly?",
            "Hello [NAME], we work with builders who have traffic but need better conversion to quotes. Does that fit you?",
            "Hi [NAME], I saw you get decent web traffic. The question is: how many of those visitors become quote requests?"
        ]),
        "opportunity_analysis": "Medium digital presence. Clear opportunity in conversion improvement and lead follow-up automation."
    },
    {
        "name": "Stark Industrial Works",
        "website": "www.stark-industrial.example",
        "city": "Metropolis",
        "industry": "Industrial Construction",
        "phone": "+1 555 010 0005",
        "digital_score": 72,
        "opportunity_level": "low",
        "redes_sociales": True,
        "captacion_leads": True,
        "email_marketing": True,
        "video_contenido": False,
        "seo_info": True,
        "hooks": json.dumps([
            "Solid digital presence but no video content — that could lift credibility by ~40%.",
            "You have email marketing. Question: are you auto-following-up on unanswered quotes?",
            "Have you considered corporate video to showcase your projects?"
        ]),
        "opening_lines": json.dumps([
            "Hi [NAME], this is [YOUR COMPANY]. I analyzed Stark Industrial — strong digital base. I spotted a video gap you could close easily.",
            "Hello [NAME], we work with firms like yours that already have digital but want to optimize ROI. Interested in a quick call?",
            "Hi [NAME], you produce plenty of content. Have you considered adding video to lift conversion?"
        ]),
        "opportunity_analysis": "Strong digital presence. Smaller but viable opportunity in video marketing and advanced conversion."
    },
]


async def main() -> None:
    async with aiosqlite.connect(DB_PATH) as conn:
        conn.row_factory = aiosqlite.Row
        await conn.execute("PRAGMA foreign_keys = ON")

        cursor = await conn.execute("SELECT id FROM lu_users ORDER BY id LIMIT 1")
        user_row = await cursor.fetchone()
        if not user_row:
            logger.error("No users found. Run create_users.py first.")
            return

        owner_id = user_row["id"]
        logger.info(f"Inserting demo leads for user id={owner_id}")

        today = str(date.today())
        inserted = 0

        for lead in TEST_LEADS:
            cursor = await conn.execute(
                """
                INSERT INTO lu_companies (
                    name, website, city, industry, phone, digital_score,
                    opportunity_level, redes_sociales, captacion_leads,
                    email_marketing, video_contenido, seo_info,
                    hooks, opening_lines, opportunity_analysis
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    lead["name"],
                    lead["website"],
                    lead["city"],
                    lead["industry"],
                    lead["phone"],
                    lead["digital_score"],
                    lead["opportunity_level"],
                    lead["redes_sociales"],
                    lead["captacion_leads"],
                    lead["email_marketing"],
                    lead["video_contenido"],
                    lead["seo_info"],
                    lead["hooks"],
                    lead["opening_lines"],
                    lead["opportunity_analysis"],
                ),
            )
            company_id = cursor.lastrowid
            await conn.commit()
            logger.info(f"Company created: {lead['name']} (id={company_id})")

            contact_name = lead["name"].split()[0] if lead["name"] else "Contact"
            cursor = await conn.execute(
                """
                INSERT INTO lu_contacts (company_id, name, title, phone, email)
                VALUES (?, ?, ?, ?, ?)
                """,
                (company_id, contact_name, "Manager", lead["phone"], None),
            )
            await conn.commit()

            await conn.execute(
                """
                INSERT INTO lu_daily_assignments (company_id, user_id, assigned_date, status)
                VALUES (?, ?, ?, ?)
                """,
                (company_id, owner_id, today, "pending"),
            )
            await conn.commit()
            inserted += 1

        logger.info(f"Done: {inserted} demo leads inserted for user id={owner_id}")


if __name__ == "__main__":
    asyncio.run(main())
