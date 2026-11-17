"""Tests for app.lead_engine — Core business logic (TDD: Write tests FIRST)."""
import pytest


# ============================================================================
# EMAIL EXTRACTION & DEOBFUSCATION
# ============================================================================
class TestEmailExtraction:
    """Test email extraction from raw text including obfuscated emails."""

    def test_extract_standard_email(self):
        from app.lead_engine import normalize_deobfuscated_emails
        result = normalize_deobfuscated_emails("Contact us at info@alfazalrice.com for orders")
        assert "info@alfazalrice.com" in result

    def test_extract_multiple_emails(self):
        from app.lead_engine import normalize_deobfuscated_emails
        text = "Email: sales@ricemill.com or procurement@grains.ae for bulk orders"
        result = normalize_deobfuscated_emails(text)
        assert len(result) >= 2
        assert "sales@ricemill.com" in result
        assert "procurement@grains.ae" in result

    def test_deobfuscate_at_dot_format(self):
        from app.lead_engine import normalize_deobfuscated_emails
        text = "Contact: info [at] ricecompany [dot] com"
        result = normalize_deobfuscated_emails(text)
        assert "info@ricecompany.com" in result

    def test_deobfuscate_parenthesis_format(self):
        from app.lead_engine import normalize_deobfuscated_emails
        text = "Email: admin(at)graintrader(dot)ae"
        result = normalize_deobfuscated_emails(text)
        assert "admin@graintrader.ae" in result

    def test_filter_junk_email_domains(self):
        from app.lead_engine import normalize_deobfuscated_emails
        text = "example@example.com and info@wixpress.com"
        result = normalize_deobfuscated_emails(text)
        assert "example@example.com" not in result
        assert "info@wixpress.com" not in result

    def test_filter_image_extension_emails(self):
        from app.lead_engine import normalize_deobfuscated_emails
        text = "logo@images.png and icon@site.jpg"
        result = normalize_deobfuscated_emails(text)
        assert len(result) == 0

    def test_empty_text_returns_empty(self):
        from app.lead_engine import normalize_deobfuscated_emails
        assert normalize_deobfuscated_emails("") == []
        assert normalize_deobfuscated_emails(None) == []

    def test_returns_sorted_unique_emails(self):
        from app.lead_engine import normalize_deobfuscated_emails
        text = "info@test.com and INFO@TEST.COM and info@test.com"
        result = normalize_deobfuscated_emails(text)
        assert len(result) == 1  # deduplicated

    def test_strips_surrounding_punctuation(self):
        from app.lead_engine import normalize_deobfuscated_emails
        text = "(info@ricetrader.com)."
        result = normalize_deobfuscated_emails(text)
        assert "info@ricetrader.com" in result


# ============================================================================
# PHONE NORMALIZATION (E.164)
# ============================================================================
class TestPhoneNormalization:
    """Test E.164 phone number normalization."""

    def test_indian_mobile_with_plus91(self):
        from app.lead_engine import normalize_phones
        result = normalize_phones("+91 9775976251", "IN")
        assert "+919775976251" in result

    def test_indian_mobile_without_country_code(self):
        from app.lead_engine import normalize_phones
        result = normalize_phones("9775976251", "IN")
        assert "+919775976251" in result

    def test_uae_phone_number(self):
        from app.lead_engine import normalize_phones
        result = normalize_phones("+971 4 2988850", "AE")
        assert "+97142988850" in result

    def test_saudi_phone_number(self):
        from app.lead_engine import normalize_phones
        result = normalize_phones("+966 3 8321843", "SA")
        assert "+96638321843" in result

    def test_qatar_phone_number(self):
        from app.lead_engine import normalize_phones
        result = normalize_phones("+974 44689844", "QA")
        assert "+97444689844" in result

    def test_multiple_phones_in_text(self):
        from app.lead_engine import normalize_phones
        text = "+91 9732009854 / +91 9434002270"
        result = normalize_phones(text, "IN")
        assert len(result) >= 2

    def test_phone_with_00_prefix(self):
        from app.lead_engine import normalize_phones
        result = normalize_phones("00971 4 2988850", "AE")
        assert "+97142988850" in result

    def test_empty_text_returns_empty(self):
        from app.lead_engine import normalize_phones
        assert normalize_phones("", "IN") == []
        assert normalize_phones(None, "IN") == []

    def test_returns_sorted_unique_phones(self):
        from app.lead_engine import normalize_phones
        text = "+91 9775976251 and +91 9775976251"
        result = normalize_phones(text, "IN")
        assert len(result) == 1


# ============================================================================
# NON-BASMATI CLASSIFIER
# ============================================================================
class TestNonBasmatiClassifier:
    """Test the Non-Basmati relevance classifier."""

    def test_accepts_ir64_parboiled(self):
        from app.lead_engine import classify_non_basmati_relevance
        accepted, tags, score = classify_non_basmati_relevance(
            "We need 250 MT of IR-64 Parboiled Rice"
        )
        assert accepted is True
        assert score > 0

    def test_accepts_swarna_rice(self):
        from app.lead_engine import classify_non_basmati_relevance
        accepted, tags, score = classify_non_basmati_relevance("Swarna Parboiled Rice supplier needed")
        assert accepted is True

    def test_accepts_miniket_rice(self):
        from app.lead_engine import classify_non_basmati_relevance
        accepted, tags, score = classify_non_basmati_relevance("Miniket rice mill in Burdwan")
        assert accepted is True

    def test_accepts_non_basmati_keyword(self):
        from app.lead_engine import classify_non_basmati_relevance
        accepted, tags, score = classify_non_basmati_relevance("Non-Basmati rice for bulk export")
        assert accepted is True
        assert score >= 25

    def test_rejects_basmati_only(self):
        from app.lead_engine import classify_non_basmati_relevance
        accepted, tags, score = classify_non_basmati_relevance(
            "Pure Basmati rice 1121 premium quality"
        )
        assert accepted is False

    def test_accepts_basmati_with_non_basmati_signal(self):
        from app.lead_engine import classify_non_basmati_relevance
        accepted, tags, score = classify_non_basmati_relevance(
            "We supply both Basmati and Non-Basmati Parboiled Rice"
        )
        assert accepted is True

    def test_rejects_no_rice_signal(self):
        from app.lead_engine import classify_non_basmati_relevance
        accepted, tags, score = classify_non_basmati_relevance("Software development company")
        assert accepted is False
        assert score == 0

    def test_rejects_excluded_hs_code_only(self):
        from app.lead_engine import classify_non_basmati_relevance
        accepted, tags, score = classify_non_basmati_relevance(
            "Importing under HS code 10063012 Basmati"
        )
        assert accepted is False

    def test_accepts_hs_10063019(self):
        from app.lead_engine import classify_non_basmati_relevance
        accepted, tags, score = classify_non_basmati_relevance(
            "Export rice under 10063019 parboiled"
        )
        assert accepted is True

    def test_scoring_ir64_higher_than_general(self):
        from app.lead_engine import classify_non_basmati_relevance
        _, _, score_ir64 = classify_non_basmati_relevance("IR-64 Parboiled rice")
        _, _, score_general = classify_non_basmati_relevance("General rice importer")
        assert score_ir64 > score_general

    def test_empty_text(self):
        from app.lead_engine import classify_non_basmati_relevance
        accepted, tags, score = classify_non_basmati_relevance("")
        assert accepted is False

    def test_gobindobhog_accepted(self):
        from app.lead_engine import classify_non_basmati_relevance
        accepted, _, _ = classify_non_basmati_relevance("Gobindobhog aromatic short-grain rice")
        assert accepted is True


# ============================================================================
# GSTIN / PAN / FSSAI DECODING
# ============================================================================
class TestGstinPanFssaiDecoding:
    """Test statutory ID extraction from text."""

    def test_extract_gstin(self):
        from app.lead_engine import decode_gstin_and_fssai
        gstin, pan, fssai = decode_gstin_and_fssai("GSTIN: 19AFEFS8977B1ZH registered mill")
        assert gstin == "19AFEFS8977B1ZH"

    def test_extract_pan_from_gstin(self):
        from app.lead_engine import decode_gstin_and_fssai
        gstin, pan, fssai = decode_gstin_and_fssai("GST No: 19AFEFS8977B1ZH")
        assert pan == "AFEFS8977B"

    def test_extract_standalone_pan(self):
        from app.lead_engine import decode_gstin_and_fssai
        gstin, pan, fssai = decode_gstin_and_fssai("PAN: AACFN6597M verified")
        assert pan == "AACFN6597M"

    def test_extract_fssai_14_digit(self):
        from app.lead_engine import decode_gstin_and_fssai
        gstin, pan, fssai = decode_gstin_and_fssai("FSSAI License: 11926003004567")
        assert fssai == "11926003004567"

    def test_wb_gstin_starts_with_19(self):
        from app.lead_engine import decode_gstin_and_fssai
        gstin, _, _ = decode_gstin_and_fssai("19AABCG1976F1ZJ")
        assert gstin.startswith("19")

    def test_empty_text(self):
        from app.lead_engine import decode_gstin_and_fssai
        gstin, pan, fssai = decode_gstin_and_fssai("")
        assert gstin == ""
        assert pan == ""
        assert fssai == ""

    def test_no_match_returns_empty(self):
        from app.lead_engine import decode_gstin_and_fssai
        gstin, pan, fssai = decode_gstin_and_fssai("No IDs here, just text")
        assert gstin == ""
        assert fssai == ""


# ============================================================================
# COMPANY NAME CLEANING (for deduplication)
# ============================================================================
class TestCompanyNameCleaning:
    """Test company name normalization for deduplication."""

    def test_strips_pvt_ltd(self):
        from app.lead_engine import clean_company_key
        result = clean_company_key("Sonik Industries Pvt. Ltd.")
        assert "pvt" not in result
        assert "ltd" not in result
        assert "sonik" in result
        assert "industries" in result

    def test_strips_llc(self):
        from app.lead_engine import clean_company_key
        result = clean_company_key("Al Fazal Rice Trading LLC")
        assert "llc" not in result
        assert "al fazal" in result

    def test_strips_llp(self):
        from app.lead_engine import clean_company_key
        result = clean_company_key("Sonik Industries LLP")
        assert "llp" not in result

    def test_strips_fze_fzco_dmcc(self):
        from app.lead_engine import clean_company_key
        for suffix in ["FZE", "FZCO", "DMCC"]:
            result = clean_company_key(f"Rice Trading {suffix}")
            assert suffix.lower() not in result

    def test_normalizes_special_chars(self):
        from app.lead_engine import clean_company_key
        result = clean_company_key("Asia & Africa General Trading (L.L.C.)")
        assert "&" not in result
        assert "(" not in result

    def test_empty_or_none(self):
        from app.lead_engine import clean_company_key
        assert clean_company_key("") == ""
        assert clean_company_key(None) == ""

    def test_lowercase_output(self):
        from app.lead_engine import clean_company_key
        result = clean_company_key("WALQ Food Industries LLC")
        assert result == result.lower()


# ============================================================================
# MACHINERY FILTER (for WB mills)
# ============================================================================
class TestMachineryFilter:
    """Test machinery/spare-parts seller rejection logic."""

    def test_rejects_machinery_seller(self):
        from app.lead_engine import is_machinery_or_spare_parts_seller
        assert is_machinery_or_spare_parts_seller("Shankar Engineering Corp - Rice Mill Machinery") is True

    def test_rejects_pulverizer_seller(self):
        from app.lead_engine import is_machinery_or_spare_parts_seller
        assert is_machinery_or_spare_parts_seller("Bardhaman Pulverizer Parts Store") is True

    def test_rejects_blower_screen_seller(self):
        from app.lead_engine import is_machinery_or_spare_parts_seller
        assert is_machinery_or_spare_parts_seller("Howrah Blower and Screen Supplier") is True

    def test_accepts_genuine_rice_mill(self):
        from app.lead_engine import is_machinery_or_spare_parts_seller
        assert is_machinery_or_spare_parts_seller("Sonik Industries LLP - Rice Mill, Nadia") is False

    def test_rejects_software_vendor(self):
        from app.lead_engine import is_machinery_or_spare_parts_seller
        assert is_machinery_or_spare_parts_seller("Rice Mill Software Solutions") is True

    def test_rejects_spare_parts_supplier(self):
        from app.lead_engine import is_machinery_or_spare_parts_seller
        assert is_machinery_or_spare_parts_seller("Supplier of rice mill spare parts and belts") is True

    def test_accepts_rice_exporter(self):
        from app.lead_engine import is_machinery_or_spare_parts_seller
        assert is_machinery_or_spare_parts_seller("Bengal Food Products Pvt Ltd - Rice Exporter") is False


# ============================================================================
# DISTRICT DETECTION (WB mills)
# ============================================================================
class TestDistrictDetection:
    """Test West Bengal district detection from text."""

    def test_detects_burdwan(self):
        from app.lead_engine import detect_wb_district
        districts = ["Purba Bardhaman", "Burdwan", "Bardhaman", "Hooghly"]
        result = detect_wb_district("Mill at Nutanganj, Burdwan 713102", districts)
        assert "Bardhaman" in result or "Burdwan" in result

    def test_detects_hooghly(self):
        from app.lead_engine import detect_wb_district
        districts = ["Purba Bardhaman", "Hooghly", "Birbhum"]
        result = detect_wb_district("Arambagh, Hooghly, West Bengal", districts)
        assert "Hooghly" in result

    def test_detects_nadia(self):
        from app.lead_engine import detect_wb_district
        districts = ["Nadia", "Hooghly"]
        result = detect_wb_district("Chakdaha, Nadia 741222", districts)
        assert "Nadia" in result

    def test_fallback_to_west_bengal(self):
        from app.lead_engine import detect_wb_district
        districts = ["Purba Bardhaman", "Hooghly"]
        result = detect_wb_district("Some place in India", districts)
        assert result == "West Bengal"


# ============================================================================
# COUNTRY TO ISO2 MAPPING
# ============================================================================
class TestCountryMapping:
    """Test country name to ISO2 code mapping."""

    def test_uae_variations(self):
        from app.lead_engine import COUNTRY_TO_ISO2
        assert COUNTRY_TO_ISO2["united arab emirates"] == "AE"
        assert COUNTRY_TO_ISO2["uae"] == "AE"
        assert COUNTRY_TO_ISO2["dubai"] == "AE"

    def test_saudi_arabia(self):
        from app.lead_engine import COUNTRY_TO_ISO2
        assert COUNTRY_TO_ISO2["saudi arabia"] == "SA"

    def test_qatar(self):
        from app.lead_engine import COUNTRY_TO_ISO2
        assert COUNTRY_TO_ISO2["qatar"] == "QA"

    def test_india(self):
        from app.lead_engine import COUNTRY_TO_ISO2
        assert COUNTRY_TO_ISO2["india"] == "IN"

