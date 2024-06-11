import ColorThief from './node_modules/colorthief/dist/color-thief.mjs'

function clear() {
    sessionStorage.removeItem("spotify_access_token")
}

function parseHashParams() {
    const hash = window.location.hash.substr(1);
    return hash.split('&').reduce(function (result, item) {
        const parts = item.split('=');
        result[parts[0]] = decodeURIComponent(parts[1]);
        return result;
    }, {});
}

document.addEventListener('DOMContentLoaded', () => {
    const tokens = parseHashParams();
    if (tokens.access_token) {
        sessionStorage.setItem('spotify_access_token', tokens.access_token);
        sessionStorage.setItem('spotify_refresh_token', tokens.refresh_token);
        
        document.getElementById('loginPage').style.display = 'none';
        document.getElementById('decksPage').style.display = 'flex';

        switchTab(1);
        
        window.history.pushState("", document.title, window.location.pathname + window.location.search);
    }

    document.getElementById('spotifyLogin').addEventListener('click', function() {
        window.location.href = '/login'; 
    });
});

/*
--- Not Currently in use, might be able to delete --
function fetchUserInfo(accessToken) {
    fetch('https://api.spotify.com/v1/me', {
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    })
    .then(response => response.json())
    .then(data => {
        const userInfoDiv = document.getElementById('user-info');
        userInfoDiv.textContent = `Welcome, ${data.display_name}`;
        userInfoDiv.style.display = 'block';
    })
    .catch(error => console.error('Error fetching user info:', error));
}
*/

function getAccessToken() {
    return sessionStorage.getItem('spotify_access_token');
}

// Array for API Data
let listings = [];

// Fetch API Data from Spotify based on parameters, then assign response data to listings[]
function populateArray(type, range, limit, accessToken) {
    fetch('https://api.spotify.com/v1/me/top/'+type+'?time_range='+range+'&limit='+limit, {
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log('API Data:', data);
        if (!data.items) {
            throw new Error('No items available in the response');
        }
        listings = transformAPIToListings(data.items, type);
        generateDeck()
    })
    .catch(error => console.error('Error fetching user info:', error));
};

 // Correctly map API data to an array of objects.
 function transformAPIToListings(apiData, type) {
    return apiData.map(item => {
        if (type === 'tracks') {
            const image = item.album.images.length > 0 ? item.album.images[0].url : undefined;
            return {
                id: item.id,
                type: type,
                title: item.name,
                album: item.album.name,
                albType: item.album.type,
                release: item.album.release_date +" "+ item.album.release_date_precision,
                duration: Math.round((item.duration_ms / 1000) / 60) + ":" + 
                    (("0" + Math.floor((item.duration_ms / 1000) % 60)).slice(-2)),
                artist: item.artists.map(artist => artist.name).join(', '), 
                artistGenre: item.artists.map(artist => artist.genres).join(','),
                artistID: item.artists.map(artist => artist.id).join(','),
                trackNum: item.track_number,
                pop: item.popularity,
                image: image
            };
        } else if (type === 'artists') {
            const image = item.album.images.length > 0 ? item.album.images[0].url : undefined;
            return {
                id: item.id,
                type: type,
                title: item.name,
                pop: item.popularity,
                followers: item.followers.total,
                artistGenre: item.artists.map(artist => artist.genres).join(','),
                image: image
            };
        }
    });
}

// Starts generation of new cards/decks after user clicks an option
function switchTab(tab) {
    const accessToken = sessionStorage.getItem("spotify_access_token")
    if(tab===1) {
        populateArray("tracks","long_term", 50, accessToken);
    } else {
        populateArray("artists","long_term", 50, accessToken);
    }
}

async function generateDeck() {
    const surface = document.getElementById('surface');
    surface.innerHTML = '';

    // Create a card for the first listing only
    if (listings.length > 0) {
        try {
            const cardElement = await createCard(listings[0]);
            surface.appendChild(cardElement);
        } catch (error) {
            console.error('Error creating card:', error);
        }
    }
}

/*  Generates all cards
async function generateDeck() {
    const surface = document.getElementById('surface');
    surface.innerHTML = '';
    const cardPromises = listings.map(listing => createCard(listing));
    
    try {
        const cardElements = await Promise.all(cardPromises);
        cardElements.forEach(cardElement => {
            surface.appendChild(cardElement);
        });
    } catch (error) {
        console.error('Error creating cards:', error);
    }
}
*/

function loadImage(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.src = url;
        img.onload = () => resolve(img);
        img.onerror = reject;
    });
}

async function createCard(data) {
    // create canvas object and obtain its context for drawing 
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 420;
    canvas.height = 590;

    try {
        const artwork = await loadImage(data.image);
        const template = await loadImage('cardTemplate.png');
        
        // ColorThief API, obtain palette, and validate generated colors
        const colorThief = new ColorThief();
        const rawPalette = colorThief.getPalette(artwork, 10, 10);
        const palette = checkColors(rawPalette);
        
        drawTemplateTint(ctx, template, palette); // Draw color tint to template and the template to canvas
        drawListingData(ctx, data);               // Draw listing specific text to canvas
        ctx.drawImage(artwork, 20, 180, 360, 360); // ------------------------------------------ REMOVE THIS LINE LATER ---------------------------
    } catch (error) {
        console.error('Failed to load image or template', error);
    }

    return canvas;
}

function rgbToHex(r, g, b) {
    return ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0').toUpperCase();
}

function checkColors(palette) {

    // -----------------------------IMPLEMENT EDGE CASE HANDLING------------------
    return palette.map(color => {
        return rgbToHex(color[0], color[1], color[2]);
    });
}

function drawTemplateTint(ctx, template, palette) {
    ctx.drawImage(template, 0, 0, ctx.canvas.width, ctx.canvas.height)

    console.log(palette);
    ctx.fillStyle = '#'+ palette[0] + 'A6';   
     ctx.globalCompositeOperation = 'multiply';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.globalCompositeOperation = 'source-over';
}

function drawListingData(ctx, data) {
    return;
}

/*
Old createCard function, refactor to support colorThief/Canvas
function createCard(data) {
    let card = document.createElement('div');
    card.className = 'card';

    let head = document.createElement('div');
    head.className = 'head';

    let headType = document.createElement('div');
    headType.className = 'headType';
    headType.textContent = data.type === 'tracks' ? 'SONG' : data.type === 'artists' ? 'ARTIST' : '';

    let headTitle = document.createElement('div');
    headTitle.className = 'headTitle';
    headTitle.textContent = data.title;

    head.appendChild(headType);
    head.appendChild(headTitle);

    if (data.type === 'tracks') {
        let headArtist = document.createElement('div');
        headArtist.className = 'headArtist';
        headArtist.textContent = data.artist;

        let headArtistLabel = document.createElement('div');
        headArtistLabel.className = 'smallLabel';
        headArtistLabel.textContent = 'Art|  ';
        headArtist.prepend(headArtistLabel);

        let headAlbum = document.createElement('div');
        headAlbum.className = 'headAlbum';
        headAlbum.textContent = data.album;

        let headAlbumLabel = document.createElement('div');
        headAlbumLabel.className = 'smallLabel';
        headAlbumLabel.textContent = 'Alb|  ';
        headAlbum.prepend(headAlbumLabel);

        let headDur = document.createElement('div');
        headDur.className = 'headDur';
        headDur.textContent = data.duration;

        let headDurLabel = document.createElement('div');
        headDurLabel.className = 'smallLabel';
        headDurLabel.textContent = 'Dur|  ';
        headDur.prepend(headDurLabel);

        let headAlbumArtist = document.createElement('div');
        headAlbumArtist.className = 'headAlbumArtist';

        headAlbumArtist.appendChild(headArtist);
        headAlbumArtist.appendChild(headAlbum);

        head.appendChild(headDur);
        head.appendChild(headAlbumArtist);
    }

    if (data.type === 'artists') {
     // Artist Specific Card Generation
    }

    card.appendChild(head);

    let cardBody = document.createElement('div');
    cardBody.className = 'cardBody';

    let img = document.createElement('img');
    img.className = 'cardImg';
    img.src = data.image;

    cardBody.appendChild(img)
    card.appendChild(cardBody);

    let foot = document.createElement('div');
    foot.className = 'foot';

    if (data.type === 'tracks') {
        let footAlbType = document.createElement('div');
        footAlbType.className = 'footAlbTyp';
        footAlbType.textContent = data.trackNum;

        let footAlbTypeLabel = document.createElement('div');
        footAlbTypeLabel.className = 'smallLabel';
        footAlbTypeLabel.textContent = 'Track|  ';
        footAlbType.prepend(footAlbTypeLabel);

        let footGenre = document.createElement('div');
        footGenre.className = 'footGenre';
        footGenre.textContent = data.artistGenre;

        let footPop = document.createElement('div');
        footPop.className = 'footPop';
        footPop.textContent = data.pop;

        let footRel = document.createElement('div');
        footRel.className = 'footRel';
        footRel.textContent = data.release;

        foot.appendChild(footAlbType);
        foot.appendChild(footGenre);
        foot.appendChild(footPop);
        foot.appendChild(footRel);
    } else if (data.type === 'artists') {
        let footGenre = document.createElement('div');
        footGenre.className = 'footGenre';
        footGenre.textContent = data.artistGenre;

        let footPop = document.createElement('div');
        footPop.className = 'footPop';
        footPop.textContent = `Popularity: ${data.pop}`;

        let footFollowers = document.createElement('div');
        footFollowers.className = 'footFollowers';
        footFollowers.textContent = `Followers: ${data.followers}`;

        foot.appendChild(footGenre);
        foot.appendChild(footPop);
        foot.appendChild(footFollowers);
    }
    
    card.appendChild(foot);
    logColors(data.image)
    return card;
}
*/
function logColors(data) {
    const colorThief = new ColorThief();
    const imgURL = data;
    const image = new Image();
    image.src = imgURL;
    image.crossOrigin = 'Anonymous';

    if (image.complete) {
    console.log(colorThief.getColor(image));
    } else {
    image.addEventListener('load', function() {
        console.log(colorThief.getColor(image));
    });
}}