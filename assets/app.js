let watches = [];
let selectedWatch = null;
let tg = null;

// Initialize Telegram Web App
function initTelegramApp() {
    if (window.Telegram && window.Telegram.WebApp) {
        tg = window.Telegram.WebApp;
        tg.ready();
        tg.expand();
        
        // Set theme colors
        document.body.style.backgroundColor = tg.backgroundColor || '#ffffff';
        document.body.style.color = tg.textColor || '#000000';
    }
}

// Extract brand and model from description
function extractWatchInfo(description) {
    if (!description) return { title: '', details: '' };
    
    const parts = description.split(' ');
    
    // For very long descriptions, be more aggressive with truncation
    if (description.length > 80) {
        // Take first 4-5 words as title
        const titleWords = parts.slice(0, Math.min(5, parts.length));
        const title = titleWords.join(' ');
        
        // Take next portion as details, but limit length
        const remainingWords = parts.slice(Math.min(5, parts.length));
        const details = remainingWords.join(' ');
        const truncatedDetails = details.length > 120 ? details.substring(0, 120) + '...' : details;
        
        return { title: title, details: truncatedDetails };
    } else if (description.length > 40) {
        // Medium length - take first 3 words as title
        const titleWords = parts.slice(0, 3);
        const title = titleWords.join(' ');
        const details = parts.slice(3).join(' ');
        
        return { title: title, details: details };
    } else {
        // Short description - use as title only
        return { title: description, details: '' };
    }
}

// Load watches from Google Sheets
async function loadWatches() {
    showLoading(true);
    hideError();

    try {
        // Construct the Google Sheets CSV export URL
        const csvUrl = `https://docs.google.com/spreadsheets/d/${SHEET_CONFIG.SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${SHEET_CONFIG.SHEET_NAME}&range=${SHEET_CONFIG.RANGE}`;
        
        const response = await fetch(csvUrl);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}. Make sure your Google Sheet is published and accessible.`);
        }
        
        const csvText = await response.text();
        const rows = parseCSV(csvText);
        
        // Skip header row and process data
        watches = [];
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            
            // Skip empty rows
            if (!row[0] || row[0].trim() === '') continue;
            
            const watch = {
                id: i,
                description: row[0] ? row[0].trim() : '',
                price: parsePrice(row[1] ? row[1].trim() : ''),
                notes: row[2] ? row[2].trim() : '',
                rawPrice: row[1] ? row[1].trim() : ''
            };
            
            watches.push(watch);
        }
        
        renderWatches();
        showLoading(false);
        
    } catch (error) {
        console.error('Error loading watches:', error);
        showError(`Failed to load inventory: ${error.message}`);
        showLoading(false);
    }
}

// Simple CSV parser
function parseCSV(text) {
    const rows = [];
    const lines = text.split('\n');
    
    for (let line of lines) {
        if (line.trim() === '') continue;
        
        const row = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                row.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        row.push(current.trim());
        rows.push(row);
    }
    
    return rows;
}

// Parse price from string
function parsePrice(priceStr) {
    if (!priceStr) return 0;
    
    // Remove currency symbols and commas, extract numbers
    const numericStr = priceStr.replace(/[^\d.,]/g, '');
    const price = parseFloat(numericStr.replace(/,/g, ''));
    
    return isNaN(price) ? 0 : price;
}

// Format price for display
function formatPrice(price, rawPrice) {
    if (rawPrice && rawPrice.toLowerCase().includes('sold')) {
        return 'SOLD';
    }
    if (rawPrice && rawPrice.toLowerCase().includes('pending')) {
        return 'PENDING';
    }
    if (price === 0 && rawPrice) {
        return rawPrice; // Show original text if can't parse as number
    }
    return price > 0 ? `$${price.toLocaleString()}` : rawPrice || 'Price on request';
}

// Check if item is available
function isAvailable(rawPrice) {
    if (!rawPrice) return true;
    const lower = rawPrice.toLowerCase();
    return !lower.includes('sold') && !lower.includes('pending');
}

// Render watches
function renderWatches() {
    const grid = document.getElementById('watchGrid');
    grid.innerHTML = '';

    if (watches.length === 0) {
        grid.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--tg-theme-hint-color, #999999);">No watches found in the inventory.</div>';
        return;
    }

    watches.forEach(watch => {
        const watchCard = document.createElement('div');
        watchCard.className = 'watch-card';
        
        const available = isAvailable(watch.rawPrice);
        const formattedPrice = formatPrice(watch.price, watch.rawPrice);
        const watchInfo = extractWatchInfo(watch.description);
        
        watchCard.innerHTML = `
            <div class="watch-image">⌚</div>
            <div class="watch-info">
                <div class="watch-description">${watchInfo.title}</div>
                ${watchInfo.details ? `<div class="watch-details" style="font-size: 13px; color: var(--tg-theme-hint-color, #999999); margin-bottom: 12px; line-height: 1.3;">${watchInfo.details}</div>` : ''}
                <div class="watch-price" style="margin-bottom: 8px;">${formattedPrice}</div>
                ${watch.notes ? `<div class="watch-location" style="font-size: 12px; color: var(--tg-theme-hint-color, #999999); font-style: italic; margin-bottom: 16px; padding: 6px 0; border-top: 1px solid rgba(153, 153, 153, 0.2);">📍 ${watch.notes}</div>` : ''}
                <div class="watch-actions">
                    <button class="btn btn-primary" onclick="showPurchaseModal(${watch.id})" 
                            ${!available ? 'disabled' : ''}>
                        ${!available ? 'Not Available' : 'Buy Now'}
                    </button>
                    <button class="btn btn-secondary" onclick="showOfferModal(${watch.id})"
                            ${!available ? 'disabled' : ''}>
                        ${!available ? 'N/A' : 'Make Offer'}
                    </button>
                </div>
            </div>
        `;
        
        grid.appendChild(watchCard);
    });
}

// Show/hide loading indicator
function showLoading(show) {
    const loading = document.getElementById('loadingIndicator');
    loading.style.display = show ? 'block' : 'none';
}

// Show error message
function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
}

// Hide error message
function hideError() {
    document.getElementById('errorMessage').style.display = 'none';
}

// Show purchase modal
function showPurchaseModal(watchId) {
    const watch = watches.find(w => w.id === watchId);
    if (!watch || !isAvailable(watch.rawPrice)) return;
    
    selectedWatch = watch;
    const watchInfo = extractWatchInfo(watch.description);
    
    const content = document.getElementById('purchaseContent');
    content.innerHTML = `
        <div style="text-align: center; margin-bottom: 20px;">
            <div style="font-size: 48px; margin-bottom: 12px;">⌚</div>
            <h4 style="margin-bottom: 8px;">${watchInfo.title}</h4>
            ${watchInfo.details ? `<p style="color: var(--tg-theme-hint-color, #999999); margin: 4px 0; font-size: 14px;">${watchInfo.details}</p>` : ''}
            ${watch.notes ? `<p style="color: var(--tg-theme-hint-color, #999999); margin: 8px 0; font-style: italic; border-top: 1px solid var(--tg-theme-hint-color, #ddd); padding-top: 8px;">📍 ${watch.notes}</p>` : ''}
            <div style="font-size: 24px; font-weight: 700; color: var(--tg-theme-button-color, #007AFF); margin-top: 12px;">
                ${formatPrice(watch.price, watch.rawPrice)}
            </div>
        </div>
        <p style="text-align: center; color: var(--tg-theme-hint-color, #999999);">
            Ready to purchase this timepiece?
        </p>
    `;
    
    document.getElementById('purchaseModal').style.display = 'block';
}

// Show offer modal
function showOfferModal(watchId) {
    const watch = watches.find(w => w.id === watchId);
    if (!watch || !isAvailable(watch.rawPrice)) return;
    
    selectedWatch = watch;
    const watchInfo = extractWatchInfo(watch.description);
    
    const content = document.getElementById('offerContent');
    content.innerHTML = `
        <div style="text-align: center; margin-bottom: 20px;">
            <div style="font-size: 48px; margin-bottom: 12px;">⌚</div>
            <h4 style="margin-bottom: 8px;">${watchInfo.title}</h4>
            ${watchInfo.details ? `<p style="color: var(--tg-theme-hint-color, #999999); margin: 4px 0; font-size: 14px;">${watchInfo.details}</p>` : ''}
            ${watch.notes ? `<p style="color: var(--tg-theme-hint-color, #999999); margin: 8px 0; font-style: italic; border-top: 1px solid var(--tg-theme-hint-color, #ddd); padding-top: 8px;">📍 ${watch.notes}</p>` : ''}
            <div style="font-size: 20px; font-weight: 600; color: var(--tg-theme-hint-color, #999999); margin-top: 12px;">
                Listed at: ${formatPrice(watch.price, watch.rawPrice)}
            </div>
        </div>
    `;
    
    // Reset form
    document.getElementById('offerForm').reset();
    document.getElementById('offerModal').style.display = 'block';
}

// Close modal
function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
    selectedWatch = null;
}

// Confirm purchase
function confirmPurchase() {
    if (!selectedWatch) return;
    
    const userData = tg ? {
        userId: tg.initDataUnsafe?.user?.id,
        username: tg.initDataUnsafe?.user?.username,
        firstName: tg.initDataUnsafe?.user?.first_name
    } : { userId: 'demo', username: 'demo_user' };
    
    const purchaseData = {
        type: 'purchase',
        watch: {
            description: selectedWatch.description,
            price: selectedWatch.rawPrice,
            notes: selectedWatch.notes
        },
        user: userData,
        timestamp: new Date().toISOString()
    };
    
    // Send data to Telegram bot
    if (tg) {
        tg.sendData(JSON.stringify(purchaseData));
    } else {
        // Demo mode
        alert(`Purchase confirmed!\n\nWatch: ${selectedWatch.description}\nPrice: ${formatPrice(selectedWatch.price, selectedWatch.rawPrice)}\n\nThis would normally send data to your Telegram bot.`);
    }
    
    closeModal('purchaseModal');
}

// Submit offer
function submitOffer() {
    if (!selectedWatch) return;
    
    const offerAmount = document.getElementById('offerAmount').value;
    const offerMessage = document.getElementById('offerMessage').value;
    
    if (!offerAmount) {
        alert('Please enter an offer amount');
        return;
    }
    
    const userData = tg ? {
        userId: tg.initDataUnsafe?.user?.id,
        username: tg.initDataUnsafe?.user?.username,
        firstName: tg.initDataUnsafe?.user?.first_name
    } : { userId: 'demo', username: 'demo_user' };
    
    const offerData = {
        type: 'offer',
        watch: {
            description: selectedWatch.description,
            price: selectedWatch.rawPrice,
            notes: selectedWatch.notes
        },
        offer: {
            amount: parseFloat(offerAmount),
            message: offerMessage
        },
        user: userData,
        timestamp: new Date().toISOString()
    };
    
    // Send data to Telegram bot
    if (tg) {
        tg.sendData(JSON.stringify(offerData));
    } else {
        // Demo mode
        alert(`Offer submitted!\n\nWatch: ${selectedWatch.description}\nYour offer: $${parseFloat(offerAmount).toLocaleString()}\nMessage: ${offerMessage || 'None'}\n\nThis would normally send data to your Telegram bot.`);
    }
    
    closeModal('offerModal');
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
}

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    initTelegramApp();
    loadWatches();
});
