let currentType = '';
let currentCountry = '';
let currentSearch = '';
let currentPage = 1;
let pollTimer = null;

async function fetchStats() {
    try {
        const res = await fetch('/api/dashboard/stats');
        const data = await res.json();
        document.getElementById('stat-total').textContent = data.total_leads;
        document.getElementById('stat-importers').textContent = data.importers_count;
        document.getElementById('stat-mills').textContent = data.wb_mills_count;

        const coverage = data.total_leads > 0 
            ? Math.round(((data.leads_with_phone + data.leads_with_email) / (data.total_leads * 2)) * 100) 
            : 0;
        document.getElementById('stat-coverage').textContent = coverage + '%';
    } catch (e) {
        console.error('Error loading stats:', e);
    }
}

async function fetchLeads() {
    const params = new URLSearchParams();
    if (currentType) params.append('lead_type', currentType);
    if (currentCountry) params.append('country', currentCountry);
    if (currentSearch) params.append('search', currentSearch);
    params.append('page', currentPage);
    params.append('per_page', 25);

    try {
        const res = await fetch('/api/leads?' + params.toString());
        const data = await res.json();
        renderTable(data.leads);
        renderPagination(data);
    } catch (e) {
        console.error('Error fetching leads:', e);
    }
}

function renderTable(leads) {
    const tbody = document.getElementById('leads-tbody');
    if (!leads || leads.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center py-8 text-slate-400">No leads found. Click "Run All Scrapers" or seed data above!</td></tr>`;
        return;
    }

    tbody.innerHTML = leads.map(l => {
        const isImporter = l.lead_type === 'importer';
        const badgeClass = isImporter ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800';
        const badgeLabel = isImporter ? 'Importer' : 'WB Mill';
        const location = l.city_or_hub ? `${l.city_or_hub}, ${l.country}` : (l.district ? `${l.district}, WB` : l.country);

        return `
            <tr class="hover:bg-slate-50 transition">
                <td class="py-3 px-4">
                    <div class="font-bold text-slate-900">${escapeHtml(l.company_name)}</div>
                    <div class="text-[11px] text-slate-500">${escapeHtml(location || '—')}</div>
                </td>
                <td class="py-3 px-4">
                    <span class="inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${badgeClass}">${badgeLabel}</span>
                </td>
                <td class="py-3 px-4 text-slate-700">${escapeHtml(l.contact_person || '—')}</td>
                <td class="py-3 px-4 font-mono text-[11px] text-slate-700">
                    ${l.phones ? `<span class="text-emerald-700 font-semibold">${escapeHtml(l.phones)}</span>` : '<span class="text-slate-300">None</span>'}
                </td>
                <td class="py-3 px-4 text-slate-700">
                    ${l.emails ? `<a href="mailto:${l.emails.split(';')[0]}" class="text-blue-600 hover:underline">${escapeHtml(l.emails.split(';')[0])}</a>` : '<span class="text-slate-300">None</span>'}
                </td>
                <td class="py-3 px-4 text-slate-600 max-w-xs truncate" title="${escapeHtml(l.matched_varieties || '')}">
                    ${escapeHtml(l.matched_varieties || l.inquiry_or_profile || '—')}
                </td>
                <td class="py-3 px-4 text-center">
                    <span class="font-bold text-[11px] px-2 py-0.5 rounded ${l.priority_score >= 90 ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-slate-600'}">${l.priority_score || 0}</span>
                </td>
                <td class="py-3 px-4 text-right space-x-1 whitespace-nowrap">
                    <button onclick='viewLead(${JSON.stringify(l).replace(/'/g, "&#39;")})' class="p-1 text-slate-500 hover:text-emerald-700 cursor-pointer" title="View Details">
                        <i data-lucide="eye" class="w-4 h-4 inline"></i>
                    </button>
                    <button onclick="deleteLead(${l.id})" class="p-1 text-slate-400 hover:text-red-600 cursor-pointer" title="Delete">
                        <i data-lucide="trash-2" class="w-4 h-4 inline"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
    lucide.createIcons();
}

function renderPagination(data) {
    document.getElementById('pagination-info').textContent = `Showing ${data.leads.length} of ${data.total} leads (Page ${data.page} of ${data.pages || 1})`;
    const container = document.getElementById('pagination-buttons');
    let btns = '';
    if (data.page > 1) {
        btns += `<button onclick="goToPage(${data.page - 1})" class="px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer">Prev</button>`;
    }
    if (data.page < data.pages) {
        btns += `<button onclick="goToPage(${data.page + 1})" class="px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer">Next</button>`;
    }
    container.innerHTML = btns;
}

function goToPage(p) {
    currentPage = p;
    fetchLeads();
}

function setFilter(key, val) {
    if (key === 'type') {
        currentType = val;
        ['all', 'importers', 'mills'].forEach(id => {
            const el = document.getElementById(`tab-${id}`);
            el.className = 'py-1.5 px-3 rounded-md text-slate-600 hover:text-slate-900 cursor-pointer';
        });
        const activeId = val === 'importer' ? 'importers' : (val === 'wb_mill' ? 'mills' : 'all');
        document.getElementById(`tab-${activeId}`).className = 'py-1.5 px-3 rounded-md bg-white text-slate-900 shadow-sm font-semibold cursor-pointer';
    } else if (key === 'country') {
        currentCountry = val;
    }
    currentPage = 1;
    fetchLeads();
}

let searchTimeout = null;
function handleSearch(e) {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        currentSearch = e.target.value.trim();
        currentPage = 1;
        fetchLeads();
    }, 300);
}

async function triggerScrape(type) {
    setScrapingState(true, `Running ${type === 'all' ? 'all' : type} scrapers in background...`);
    showToast(`Started ${type} scraping job...`);
    try {
        const res = await fetch(`/api/scrape/${type}`, { method: 'POST' });
        const data = await res.json();
        showToast(data.message || 'Scrape job running in background');
        startPollingScrapeStatus();
    } catch (e) {
        showToast('Error triggering scraper');
        setScrapingState(false);
    }
}

function setScrapingState(isRunning, message = '') {
    const bar = document.getElementById('live-progress-bar');
    const txtAll = document.getElementById('txt-run-all');
    const btnAll = document.getElementById('btn-run-all');
    const btnImp = document.getElementById('btn-run-imp');
    const btnMills = document.getElementById('btn-run-mills');

    if (isRunning) {
        bar.classList.remove('hidden');
        if (message) document.getElementById('progress-text').textContent = message;
        txtAll.textContent = 'Scraping Active...';
        btnAll.disabled = true;
        btnImp.disabled = true;
        btnMills.disabled = true;
        btnAll.classList.add('opacity-75', 'cursor-not-allowed');
        btnImp.classList.add('opacity-75', 'cursor-not-allowed');
        btnMills.classList.add('opacity-75', 'cursor-not-allowed');
    } else {
        bar.classList.add('hidden');
        txtAll.textContent = 'Run All Scrapers';
        btnAll.disabled = false;
        btnImp.disabled = false;
        btnMills.disabled = false;
        btnAll.classList.remove('opacity-75', 'cursor-not-allowed');
        btnImp.classList.remove('opacity-75', 'cursor-not-allowed');
        btnMills.classList.remove('opacity-75', 'cursor-not-allowed');
    }
}

function startPollingScrapeStatus() {
    clearInterval(pollTimer);
    let checks = 0;
    pollTimer = setInterval(async () => {
        checks++;
        try {
            const res = await fetch('/api/scrape/status');
            const data = await res.json();
            const activeJobs = (data.jobs || []).filter(j => j.status === 'running' || j.status === 'pending');
            
            if (activeJobs.length === 0 || checks > 40) {
                clearInterval(pollTimer);
                setScrapingState(false);
                fetchStats();
                fetchLeads();
                const recent = (data.jobs || [])[0];
                const count = recent ? recent.leads_found : 0;
                if (count > 0) {
                    showToast(`✓ Scrape completed! Added ${count} new leads.`);
                } else {
                    showToast('✓ Scrape completed. (Found entities were already in DB - deduplicated).');
                }
            } else {
                fetchStats();
                fetchLeads();
            }
        } catch (e) {
            console.error('Error polling scrape status:', e);
        }
    }, 2000);
}

async function seedData(type) {
    showToast(`Loading verified ${type} seeds...`);
    try {
        const res = await fetch(`/api/seed/${type}`, { method: 'POST' });
        const data = await res.json();
        showToast(data.message);
        fetchStats();
        fetchLeads();
    } catch (e) {
        showToast('Error loading seed data');
    }
}

async function deleteLead(id) {
    if (!confirm('Are you sure you want to delete this lead?')) return;
    try {
        await fetch(`/api/leads/${id}`, { method: 'DELETE' });
        showToast('Lead deleted');
        fetchStats();
        fetchLeads();
    } catch (e) {
        showToast('Failed to delete lead');
    }
}

function viewLead(l) {
    document.getElementById('modal-title').textContent = l.company_name;
    const badge = document.getElementById('modal-type-badge');
    badge.textContent = l.lead_type === 'importer' ? 'Global Importer' : 'WB Rice Mill';
    badge.className = l.lead_type === 'importer' ? 'inline-block mt-1 text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-blue-100 text-blue-800' : 'inline-block mt-1 text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800';

    const body = document.getElementById('modal-body');
    body.innerHTML = `
        <div><span class="text-slate-400 block">Contact Person:</span><span class="font-medium text-slate-800">${escapeHtml(l.contact_person || '—')}</span></div>
        <div><span class="text-slate-400 block">Phones / WhatsApp:</span><span class="font-mono text-emerald-700 font-semibold">${escapeHtml(l.phones || '—')}</span></div>
        <div><span class="text-slate-400 block">Emails:</span><span class="font-medium text-blue-600">${escapeHtml(l.emails || '—')}</span></div>
        <div><span class="text-slate-400 block">Website:</span>${l.website ? `<a href="${l.website}" target="_blank" class="text-blue-600 underline">${escapeHtml(l.website)}</a>` : '—'}</div>
        <div><span class="text-slate-400 block">Location:</span><span class="text-slate-800">${escapeHtml(l.city_or_hub || l.district || '')}, ${escapeHtml(l.country || '')}</span></div>
        <div><span class="text-slate-400 block">Address:</span><span class="text-slate-800">${escapeHtml(l.address || '—')}</span></div>
        ${l.gstin ? `<div><span class="text-slate-400 block">GSTIN / PAN:</span><span class="font-mono text-slate-800">${escapeHtml(l.gstin)} (${escapeHtml(l.pan || '')})</span></div>` : ''}
        ${l.fssai_or_sfda_status ? `<div><span class="text-slate-400 block">Regulatory / SFDA:</span><span class="text-amber-700 font-semibold">${escapeHtml(l.fssai_or_sfda_status)}</span></div>` : ''}
        <div class="col-span-2"><span class="text-slate-400 block">Matched Varieties / HS Codes:</span><span class="text-slate-800">${escapeHtml(l.matched_varieties || '—')} (HS: ${escapeHtml(l.hs_codes_applicable || '10063019')})</span></div>
        <div class="col-span-2"><span class="text-slate-400 block">Inquiry / Profile:</span><p class="text-slate-700 bg-slate-50 p-2.5 rounded border border-slate-200 mt-1">${escapeHtml(l.inquiry_or_profile || '—')}</p></div>
        <div class="col-span-2 text-[11px] text-slate-400">Data Source: ${escapeHtml(l.source_url || 'Audited Registry')}</div>
    `;
    document.getElementById('lead-modal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('lead-modal').classList.add('hidden');
}

function showToast(msg) {
    const toast = document.getElementById('toast');
    document.getElementById('toast-msg').textContent = msg;
    toast.classList.remove('translate-y-20', 'opacity-0');
    setTimeout(() => {
        toast.classList.add('translate-y-20', 'opacity-0');
    }, 3000);
}

function escapeHtml(text) {
    if (!text) return '';
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return String(text).replace(/[&<>"']/g, m => map[m]);
}

document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    fetchStats();
    fetchLeads();
});
