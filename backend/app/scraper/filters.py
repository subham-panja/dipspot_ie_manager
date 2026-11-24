"""Domain filtering, user agents, and trade keyword taxonomies."""

import re

USER_AGENTS = [
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64; rv:123.0) Gecko/20100101 Firefox/123.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_3_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0",
]


JUNK_DOMAINS = {
    # Social & generic portals
    "youtube.com", "facebook.com", "instagram.com", "twitter.com", "x.com",
    "wikipedia.org", "pinterest.com", "linkedin.com", "amazon.com", "ebay.com",
    "reddit.com", "tiktok.com", "google.com", "bing.com", "yahoo.com", "duckduckgo.com",
    # Gaming & entertainment portals (Solitaire, Sea of Thieves, Steam, Roblox, HLTV, etc.)
    "solitaired.com", "solitr.com", "seaofthieves.com", "steampowered.com", "roblox.com",
    "twitch.tv", "ign.com", "gamespot.com", "vgtimes.com", "epicgames.com",
    "minecraft.net", "friv.com", "crazygames.com", "pogo.com", "chess.com",
    "miniclip.com", "gameforge.com", "playstation.com", "xbox.com", "nintendo.com",
    "hltv.org", "liquipedia.net", "gosugamers.net", "vlr.gg",
    # Dictionaries, encyclopedias & translation portals
    "merriam-webster.com", "cambridge.org", "dictionary.cambridge.org", "dictionary.com",
    "thesaurus.com", "wiktionary.org", "weblio.jp", "lexico.com", "vocabulary.com",
    "collinsdictionary.com", "oxfordlearnersdictionaries.com", "urbandictionary.com",
    "britannica.com", "investopedia.com", "wikihow.com",
    # Tech forums, code repositories, QA, and malware guides
    "github.com", "gitlab.com", "stackoverflow.com", "medium.com", "zhihu.com",
    "baidu.com", "jingyan.baidu.com", "baike.baidu.com", "tieba.baidu.com",
    "port.io", "autonomous.ai", "malwaretips.com", "uirusu.jp", "quora.com",
    "archive.org", "answers.com", "geekflare.com", "howtogeek.com", "sourceforge.net",
    "npm.js", "pypi.org",
    # Consumer fast food chains & meal delivery portals
    "dominos.com", "dominos.co.uk", "pizzahut.com", "mcdonalds.com", "kfc.com",
    "subway.com", "starbucks.com", "zomato.com", "swiggy.com", "ubereats.com",
    "doordash.com", "deliveroo.com", "grubhub.com", "burgerking.com", "papajohns.com",
    # Travel, tourism, lifestyle & quote directories
    "tripadvisor.com", "vietnam.travel", "allrecipes.com", "foodnetwork.com",
    "tabelog.com", "yelp.com", "lonelyplanet.com", "booking.com", "airbnb.com",
    "azquotes.com", "a-zquotes.com", "brainyquote.com", "goodreads.com",
    # Real estate & housing portals
    "zillow.com", "realtor.com", "realestate.com.au", "trulia.com", "redfin.com", "rightmove.co.uk",
    # Couriers & tracking portals
    "ups.com", "fedex.com", "dhl.com", "usps.com", "track-trace.com", "17track.net",
    # Consumer retail & general ecommerce (non-wholesale)
    "flipkart.com", "bigbasket.com", "jiomart.com", "blinkit.com", "zepto.com",
    # Non-commercial institutions & trade aggregators
    "worldbank.org", "oec.world", "volza.com", "zauba.com", "tridge.com",
    "trademo.com", "panjiva.com", "indiamart.com", "un.org", "wto.org", "imf.org", "europa.eu",
}


B2B_DIRECTORY_DOMAINS = {
    "indiamart.com", "tradeindia.com", "go4worldbusiness.com",
    "exportersindia.com", "kompass.com", "europages.com", "europages.co.uk",
    "tradekey.com", "ec21.com", "apeda.gov.in", "atninfo.com",
    "exportmandi.com", "wbrma.com", "seair.co.in", "zaubacorp.com",
}


JUNK_PATTERNS = [
    # Gaming & entertainment & esports
    re.compile(r"\b(solitaire|gameplay|play free|play online|sea of thieves|steampowered|roblox|puzzle|walkthrough|arcade|casino|slots|betting|fortnite|minecraft|hltv|counter-strike|esports|esport|gamer|twitch|liquipedia|dota|league of legends|valorant|overwatch|pubg)\b", re.I),
    # Dictionaries, definitions, translations
    re.compile(r"\b(definition\s*&\s*meaning|dictionary|synonyms|antonyms|meaning in|thesaurus|pronunciation|how to pronounce|translate|translation|grammar)\b", re.I),
    # Tech tutorials & code repos
    re.compile(r"\b(github|gitlab|stackoverflow|npm|pypi|docker|api reference|source code|bug tracker|how to install|how to uninstall|how to fix|how to enable|error code|tutorial|cheat sheet|app readiness)\b", re.I),
    # Lifestyle, consumer food delivery, quotes
    re.compile(r"\b(quotes by|famous quotes|must-try dishes|recipe|calories|pizza delivery|order pizza|order online|menu prices|food near me|restaurant review|tari hiburan)\b", re.I),
    # Articles, news & politics
    re.compile(r"\b(breaking news|editorial|opinion|blog post|press release|united nations|white house|peace, dignity and equality)\b", re.I),
    # Job recruitment & exams
    re.compile(r"\b(recruitment|admit card|answer key|syllabus|vacancy|job notification|apply online advertisement|rc \(nt\))\b", re.I),
    # Medical & clinics
    re.compile(r"\b(pain relief|chiropractic|spine & sports|dental clinic|symptoms of|treatment for|regenerative medicine)\b", re.I),
    # Real estate & housing
    re.compile(r"\b(property for sale|real estate for sale|rent apartment|houses for rent)\b", re.I),
    # Tracking & couriers
    re.compile(r"\b(tracking number|what tba means|package tracking|track your parcel)\b", re.I),
    # Malware & guides
    re.compile(r"\b(virus removal|malwaretips|uirusu|remove virus|adware|tsyndicate)\b", re.I),
]


COMMODITY_KEYWORDS_MAP = {
    "rice": {
        "rice", "basmati", "paddy", "grain", "cereal", "non basmati", "parboiled",
        "arroz", "riz", "beras", "chawal", "tandul", "1006", "100630", "10063019",
        "10063090", "10064000", "ir64", "ir-64", "sella", "brisure", "miniket", "swarna",
        "1121", "1509", "1401", "sona masoori"
    },
    "grain": {
        "grain", "grains", "cereals", "cereal", "paddy", "wheat",
        "corn", "maize", "barley", "sorghum", "céréales", "céréale", "semoule"
    },
    "wheat": {
        "wheat", "flour", "atta", "grain", "cereal", "maida", "suji", "semolina", "farine", "minoterie"
    },
    "sugar": {
        "sugar", "icuma", "sucrose", "cane", "beet sugar", "molasses", "jaggery", "sucre"
    },
    "spices": {
        "spice", "spices", "pepper", "cardamom", "turmeric", "cumin", "chilli", "coriander", "ginger", "épices"
    },
    "pulses": {
        "pulses", "lentils", "dal", "beans", "chickpeas", "peas", "gram", "legumes", "légumes secs"
    },
}


GENERAL_AGRI_TRADE_TERMS = {
    "agri", "agro", "agricultural", "agriculture", "produce",
    "commodity", "commodities", "foodstuff", "foodstuffs", "food products", "foods", "food",
    "fmcg", "grocery", "groceries", "supermarket", "supermarkets", "hypermarket", "provisions",
    "mill", "milling", "miller", "grain mill", "rice mill", "flour mill",
    "agro industries", "commodities trading", "alimentaire", "agro-alimentaire",
    "denrées", "denrees", "céréales", "cereales", "farine", "brisure", "minoterie",
    "négoce", "negoce", "grossiste", "comptoir", "tamween", "ghadha", "ghidha", "tijarah", "aruz"
}


TRADE_ROLE_TERMS = {
    "importer", "importers", "importing", "import", "buyer", "buyers",
    "consignee", "consignees", "wholesale", "wholesaler", "wholesalers",
    "distributor", "distributors", "distribution", "supplier", "suppliers", "exporter", "exporters", "exporting",
    "trading", "trader", "traders", "processor", "processors", "processing",
    "milling", "mill", "mills", "miller", "minoterie", "manufacturer", "manufacturers",
    "bulk supplier", "procurement", "merchants", "enterprise", "enterprises",
    "industries", "sourcing", "rfq", "import desk", "export terminal",
    "milling unit", "processing plant", "warehouse", "grain elevator",
    "commerce", "commercial", "alimentation", "negoce", "supermarches", "supermarche", "grossiste", "grains", "cereales",
}


CORPORATE_INDICATORS = {
    "llc", "ltd", "limited", "pvt", "inc", "corp", "corporation",
    "sarl", "gmbh", "b.v.", "bv", "s.a.", "sa", "co.", "trading",
    "exports", "imports", "enterprises", "mills", "mill", "agro",
    "farms", "industries", "commercial", "general trading", "holdings",
    "group", "groupe", "international", "company", "co", "fze", "fzc", "w.l.l.", "spc", "est", "establishment",
    "desk", "terminal", "operations", "hub", "llp", "millers", "federation",
    "societe", "etablissements", "centrale", "omnium", "comptoir",
}


AUTHORIZED_GOVT_AND_PORT_DOMAINS = {
    "apeda.gov.in", "dgft.gov.in", "icegate.gov.in", "cbic.gov.in", "commerce.gov.in",
    "wbapmc.gov.in", "dubaicustoms.gov.ae", "sfda.gov.sa", "kpa.co.ke", "togo-port.net",
    "smportkolkata.gov.in", "mawani.gov.sa", "portdecotonou.bj", "fieo.org", "mtt.gov.bh",
    "dpworld.com", "adports.ae", "jnport.gov.in",
}


def is_blacklisted_domain(domain: str) -> bool:
    """Checks whether a domain belongs to aggregators, social sites, gaming portals, dictionaries, or non-trade government registries."""
    if not domain:
        return True
    d = domain.lower().strip()
    if d.startswith("www."):
        d = d[4:]

    # Check exact match or subdomain of blacklisted aggregator and junk domains first
    for junk in JUNK_DOMAINS:
        if d == junk or d.endswith("." + junk):
            return True

    # Never blacklist verified B2B trade directories or authorized government & port authorities
    if d in B2B_DIRECTORY_DOMAINS or any(d.endswith("." + bd) for bd in B2B_DIRECTORY_DOMAINS):
        return False

    if d in AUTHORIZED_GOVT_AND_PORT_DOMAINS or any(d.endswith("." + gd) for gd in AUTHORIZED_GOVT_AND_PORT_DOMAINS):
        return False

    # Educational / Academic portals
    if d.endswith(".edu") or ".edu." in d or d.endswith(".ac.in") or d.endswith(".ac.uk"):
        return True

    # Government, institutional, and legislation portals (except authorized export and customs bodies)
    if (".gov" in d or ".nic.in" in d or "legislation." in d or d.endswith(".mil")):
        if not any(ad in d for ad in AUTHORIZED_GOVT_AND_PORT_DOMAINS):
            return True

    return False


def is_domain_live(domain: str) -> bool:
    """Checks if a domain resolves via DNS, routing through app.real_scraper if patched."""
    import sys
    rs = sys.modules.get("app.real_scraper")
    if rs is not None and hasattr(rs, "is_domain_live"):
        return rs.is_domain_live(domain)
    from app.verifier import is_domain_live as v_live
    return v_live(domain)


def filter_live_emails(emails) -> str:
    """Filters live emails, routing through app.real_scraper if patched."""
    import sys
    rs = sys.modules.get("app.real_scraper")
    if rs is not None and hasattr(rs, "filter_live_emails"):
        return rs.filter_live_emails(emails)
    from app.verifier import filter_live_emails as v_filter
    return v_filter(emails)



