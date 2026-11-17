"""Tests for scraper modules with mocked network requests (TDD)."""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock


class TestImporterScraper:
    """Test importer scraper functions with mocked network calls."""

    @pytest.mark.asyncio
    async def test_parse_apeda_saudi_pdf_text(self):
        from app.scrapers.importers import parse_apeda_saudi_text

        sample_pdf_text = """
1. AL-FARIS EST.
PO BOX 370, DAMMAM 31411
TEL: 03-8321843
EMAIL: alfaresco@naseej.com.sa
Importer of Indian Rice and foodstuff

2. ABBAR & ZAINY COLD STORES
PO BOX 2495, JEDDAH 21451
TEL: 02-6369368
EMAIL: azcsjed@azcs.net
Rice and food grains importer
"""
        leads = parse_apeda_saudi_text(sample_pdf_text, "https://test.url/saudi.pdf")
        assert len(leads) >= 2
        assert leads[0]["country"] == "Saudi Arabia"
        assert "alfaresco@naseej.com.sa" in leads[0]["emails"]
        assert leads[0]["lead_type"] == "importer"

    @pytest.mark.asyncio
    async def test_parse_cannedfood_html(self):
        from app.scrapers.importers import parse_cannedfood_html

        sample_html = """
<html><body>
<div>
<p>Al Maya Trading LLC. United Arab Emirates, Dubai. Importer of parboiled rice, non-basmati grains.
<a href="https://www.almaya.ae">Website</a> Phone: +971 4 8230000 Email: info@almaya.ae</p>
</div>
</body></html>
"""
        leads = parse_cannedfood_html(sample_html, "https://test.url/cannedfood.html")
        assert len(leads) >= 1
        assert "al maya" in leads[0]["company_name"].lower()
        assert leads[0]["country"] == "United Arab Emirates"

    @pytest.mark.asyncio
    async def test_parse_go4wb_html(self):
        from app.scrapers.importers import parse_go4wb_html

        sample_html = """
<html><body>
<div class="card result">
Wanted : IR-64 Parboiled Rice 250 MT in 25kg bags
Buyer From United Arab Emirates
Contact : Ahmed Al-Mansoor Buyer Of Parboiled Rice
Destination Port : Jebel Ali, Dubai
Phone: +971 50 1234567
</div>
</body></html>
"""
        leads = parse_go4wb_html(
            sample_html,
            "https://test.url/go4wb",
            target_countries=["United Arab Emirates"]
        )
        assert len(leads) >= 1
        assert "United Arab Emirates" in leads[0]["country"]
        assert "Ahmed Al-Mansoor" in leads[0]["contact_person"]

    @pytest.mark.asyncio
    async def test_parse_atninfo_html(self):
        from app.scrapers.importers import parse_atninfo_html

        sample_html = """
<html><body>
<div class="company-listing">
    <h2 class="company-title"><a href="https://atninfo.com/company/al-adil">Al Adil Trading Co LLC</a></h2>
    <div class="category">Rice Importers, Wholesalers & Foodstuff</div>
    <div class="address">Al Ras Market, Deira, Dubai, UAE</div>
    <div class="phone">Tel: +971 4 2267888</div>
    <div class="email">Email: contact@aladildubai.com</div>
    <a class="web" href="https://www.aladil.com">Website</a>
</div>
</body></html>
"""
        leads = parse_atninfo_html(sample_html, "https://atninfo.com/uae/all/rice-1263")
        assert len(leads) >= 1
        assert "Al Adil Trading" in leads[0]["company_name"]
        assert leads[0]["country"] == "United Arab Emirates"
        assert "+97142267888" in leads[0]["phones"]
        assert "contact@aladildubai.com" in leads[0]["emails"]
        assert leads[0]["lead_type"] == "importer"

    @pytest.mark.asyncio
    async def test_parse_hidubai_html(self):
        from app.scrapers.importers import parse_hidubai_html

        sample_html = """
<html><body>
<div class="business-card">
    <div class="card-title">Jaleel Holdings LLC</div>
    <p class="description">Leading bulk distributor and importer of non-basmati parboiled rice and FMCG food commodities in UAE.</p>
    <span class="location">Dubai Wholesale City, Dubai</span>
    <span class="phone">+971 4 3338877</span>
    <span class="email">info@jaleelholdings.com</span>
    <a href="https://www.jaleel.com">Visit Web</a>
</div>
</body></html>
"""
        leads = parse_hidubai_html(sample_html, "https://hidubai.com/lists/knam-marketing/rice-importers")
        assert len(leads) >= 1
        assert "Jaleel Holdings" in leads[0]["company_name"]
        assert leads[0]["city_or_hub"] == "Dubai"
        assert "+97143338877" in leads[0]["phones"]
        assert leads[0]["lead_type"] == "importer"

    @pytest.mark.asyncio
    async def test_parse_spices_board_bsm_text(self):
        from app.scrapers.importers import parse_spices_board_bsm_text

        sample_text = """
1. CHOITHRAMS BSM ENQUIRY
PO Box 5249, Dubai, UAE
Contact: Mr. K. Radhakrishnan
Tel: +971-4-3474343
Email: commodities@choithrams.com
Commodities: Parboiled Rice, IR-64, Spices, Pulses

2. SULTAN CENTER OMAN
Muscat, Sultanate of Oman
Contact: Procurement Dept
Tel: +968-24-521100
Email: supply@sultan-center.com
Commodities: Non-Basmati Rice, Foodstuff
"""
        leads = parse_spices_board_bsm_text(sample_text, "https://indianspices.com/bsm.pdf")
        assert len(leads) == 2
        assert any("CHOITHRAMS" in l["company_name"].upper() for l in leads)
        assert any("SULTAN CENTER" in l["company_name"].upper() for l in leads)
        assert any(l["country"] == "Oman" for l in leads)
        assert any(l["country"] == "United Arab Emirates" for l in leads)


class TestWbMillScraper:
    """Test West Bengal mill scraper functions with mocked network calls."""

    @pytest.mark.asyncio
    async def test_parse_wbrma_html(self):
        from app.scrapers.wb_mills import parse_wbrma_html

        sample_html = """
<html><body>
<div class="member-card">
(DIRECTOR) SONIK INDUSTRIES LLP
RICE MILLERS
Mr. Subhash Ghosh (Director)
+91 9775976251 / +91 9434012345
sonikindustriesllp@gmail.com
PAN/GST No: 19AFEFS8977B1ZH
Ghetugachhi, Chakdaha, Nadia - 741222, West Bengal
</div>
</body></html>
"""
        districts = ["Purba Bardhaman", "Nadia", "Hooghly"]
        sfda_lookup = {}
        mills = parse_wbrma_html(sample_html, "https://wbrma.com/list-of-members", districts, sfda_lookup)
        assert len(mills) >= 1
        assert "SONIK INDUSTRIES" in mills[0]["company_name"].upper()
        assert mills[0]["gstin"] == "19AFEFS8977B1ZH"
        assert mills[0]["district"] == "Nadia"
        assert mills[0]["lead_type"] == "wb_mill"

    @pytest.mark.asyncio
    async def test_parse_wbrma_rejects_machinery(self):
        from app.scrapers.wb_mills import parse_wbrma_html

        sample_html = """
<html><body>
<div class="member-card">
SHANKAR ENGINEERING CORP
PAN/GST No: 19AACCS1234F1Z1
Manufacturer of Rice Mill Machinery, Blowers and Jaali Screens
G.T. Road, Burdwan
</div>
</body></html>
"""
        districts = ["Purba Bardhaman", "Nadia"]
        mills = parse_wbrma_html(sample_html, "https://wbrma.com", districts, {})
        assert len(mills) == 0

    @pytest.mark.asyncio
    async def test_parse_sfda_approved_pdf_text(self):
        from app.scrapers.wb_mills import parse_sfda_approved_mills_text

        sample_text = """
LIST OF APPROVED ESTABLISHMENTS FOR EXPORT OF RICE TO SAUDI ARABIA
1. 29 | BARDHAMAN AGRO PRODUCTS (I) PVT. LTD. | PURBA BARDHAMAN, WEST BENGAL | ACTIVE
2. 717 | PRAGATI EDIBLE PROCESSING PVT. LTD. | BURDWAN, WEST BENGAL | ACTIVE
3. 50 | PUNJAB BASMATI RICE MILL | AMRITSAR, PUNJAB | ACTIVE
"""
        lookup = parse_sfda_approved_mills_text(sample_text)
        assert len(lookup) >= 2
        assert any("bardhaman agro" in k for k in lookup)
        assert any("pragati" in k for k in lookup)
        # Non-WB mill should not be in the WB lookup
        assert not any("punjab" in k for k in lookup)

    @pytest.mark.asyncio
    async def test_parse_wbrma_office_bearers_html(self):
        from app.scrapers.wb_mills import parse_wbrma_office_bearers_html

        sample_html = """
<html><body>
<div class="office-bearer-card">
    <h3 class="name">Sri Tarun Kumar Ghosh</h3>
    <div class="designation">President, WBRMA</div>
    <div class="mill-name">Maa Durga Modern Rice Mill Pvt Ltd</div>
    <div class="district">Purba Bardhaman, West Bengal</div>
    <div class="contact">Mobile: +91 9434011223 | Email: mdrmill@gmail.com</div>
    <div class="gstin">GST: 19AAACM1234K1Z5</div>
</div>
</body></html>
"""
        mills = parse_wbrma_office_bearers_html(sample_html, "https://wbrma.com/office-bearers")
        assert len(mills) >= 1
        assert "Maa Durga Modern Rice Mill" in mills[0]["company_name"]
        assert "Sri Tarun Kumar Ghosh" in mills[0]["contact_person"]
        assert mills[0]["gstin"] == "19AAACM1234K1Z5"
        assert mills[0]["district"] == "Purba Bardhaman (Burdwan)"
        assert mills[0]["lead_type"] == "wb_mill"

    @pytest.mark.asyncio
    async def test_parse_exportersindia_html(self):
        from app.scrapers.wb_mills import parse_exportersindia_html

        sample_html = """
<html><body>
<div class="listing-item">
    <div class="title"><a href="#">Burdwan Modern Rice Mill</a></div>
    <div class="prod">Exporter & Processor of IR 64 Parboiled Rice, Swarna Rice</div>
    <div class="city">Memari, Purba Bardhaman, West Bengal</div>
    <div class="phone">+91-9832145678</div>
    <div class="gst">GSTIN: 19ABCDE1234F1Z5</div>
</div>
<div class="listing-item">
    <div class="title"><a href="#">Howrah Rice Mill Machinery Works</a></div>
    <div class="prod">Manufacturer of Huller, Polisher and Rubber Rolls</div>
    <div class="city">Howrah, West Bengal</div>
</div>
</body></html>
"""
        mills = parse_exportersindia_html(sample_html, "https://exportersindia.com/west-bengal/ir64-rice.htm")
        assert len(mills) == 1
        assert "Burdwan Modern Rice Mill" in mills[0]["company_name"]
        assert mills[0]["district"] == "Purba Bardhaman (Burdwan)"
        assert mills[0]["lead_type"] == "wb_mill"

    @pytest.mark.asyncio
    async def test_parse_tradeindia_html(self):
        from app.scrapers.wb_mills import parse_tradeindia_html

        sample_html = """
<html><body>
<div class="co-item">
    <div class="co-name">Radha Krishna Agro Products</div>
    <div class="nature">Manufacturer & Supplier of Non-Basmati Parboiled Rice, Miniket</div>
    <div class="location">Galsi, Burdwan, West Bengal</div>
    <div class="contact-num">Call: +91 9434123456</div>
    <div class="email">rkagro@gmail.com</div>
</div>
</body></html>
"""
        mills = parse_tradeindia_html(sample_html, "https://tradeindia.com/bardhaman/rice-mill")
        assert len(mills) >= 1
        assert "Radha Krishna Agro Products" in mills[0]["company_name"]
        assert "+919434123456" in mills[0]["phones"]
        assert mills[0]["district"] == "Purba Bardhaman (Burdwan)"
        assert mills[0]["lead_type"] == "wb_mill"

    @pytest.mark.asyncio
    async def test_parse_osm_overpass_json(self):
        from app.scrapers.wb_mills import parse_osm_overpass_json

        sample_json = {
            "elements": [
                {
                    "type": "node",
                    "id": 1001,
                    "lat": 23.2324,
                    "lon": 87.8615,
                    "tags": {
                        "name": "Burdwan Kisan Rice Mill",
                        "industrial": "rice_mill",
                        "addr:city": "Burdwan",
                        "addr:state": "West Bengal",
                        "phone": "+91 9832011223",
                        "website": "https://burdwankisanrice.com"
                    }
                },
                {
                    "type": "node",
                    "id": 1002,
                    "lat": 22.9000,
                    "lon": 88.4000,
                    "tags": {
                        "name": "Hooghly Agro Food Products",
                        "industrial": "rice_mill",
                        "addr:city": "Tarakeswar, Hooghly",
                        "addr:state": "West Bengal"
                    }
                }
            ]
        }
        mills = parse_osm_overpass_json(sample_json, "https://overpass-api.de/api/interpreter")
        assert len(mills) == 2
        assert "Burdwan Kisan Rice Mill" in mills[0]["company_name"]
        assert mills[0]["district"] == "Purba Bardhaman (Burdwan)"
        assert mills[1]["district"] == "Hooghly"
        assert mills[0]["lead_type"] == "wb_mill"
