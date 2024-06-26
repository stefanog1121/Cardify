function clear() {
    sessionStorage.removeItem("spotify_access_token");
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

function getAccessToken() {
    return sessionStorage.getItem('spotify_access_token');
}

// Array for API Data
let listings = [];

// Fetch API Data from Spotify based on parameters, then assign response data to listings[]
function populateArray(type, range, limit, accessToken) {
    fetch('https://api.spotify.com/v1/me/top/' + type + '?time_range=' + range + '&limit=' + limit, {
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
        generateDeck();
    })
    .catch(error => console.error('Error fetching user info:', error));
}

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
                release: item.album.release_date + " " + item.album.release_date_precision,
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
            const image = item.images.length > 0 ? item.images[0].url : undefined;
            return {
                id: item.id,
                type: type,
                title: item.name,
                pop: item.popularity,
                followers: item.followers.total,
                artistGenre: item.genres.join(','),
                image: image
            };
        }
    });
}

function switchTab(tab) {
    const accessToken = sessionStorage.getItem("spotify_access_token");
    if (tab === 1) {
        populateArray("tracks", "long_term", 50, accessToken);
    } else {
        populateArray("artists", "long_term", 50, accessToken);
    }
}

async function generateDeck() {
    const surface = document.getElementById('surface');
    surface.innerHTML = '';

    // Create a card for the first listing only
    if (listings.length > 0) {
        try {
            console.log('Generating card for listing:', listings[0]);
            const cardElement = await createCard(listings[0]);
            console.log('Appending card element to surface');
            surface.appendChild(cardElement);
        } catch (error) {
            console.error('Error creating card:', error);
        }
    }
}

async function createCard(data) {
    console.log('Creating card for data:', data);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 420;
    canvas.height = 590;

    try {
        const artwork = await loadImage(data.image);
        console.log('Artwork loaded:', artwork);
        const template = await loadImage('cardTemplate.png');
        console.log('Template loaded:', template);

        const requestBody = JSON.stringify({ imageUrl: artwork.src });
        console.log('Sending request with body:', requestBody);

        const paletteResponse = await fetch('http://localhost:8080/get-palette', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: requestBody // Ensure JSON.stringify is used here
        });

        const palette = await paletteResponse.json();
        console.log('Palette received:', palette);

        drawTemplateTint(ctx, template, palette); // Draw color tint to template and the template to canvas
        drawListingData(ctx, data);               // Draw listing specific text to canvas
        ctx.drawImage(artwork, 50, 145, 320, 320); // ------------------------------------------ REMOVE THIS LINE LATER ---------------------------
        console.log('Artwork drawn on canvas');
    } catch (error) {
        console.error('Failed to load image or template', error);
    }

    return canvas;
}

function loadImage(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.src = url;
        img.onload = () => resolve(img);
        img.onerror = reject;
    });
}

function drawTemplateTint(ctx, template, palette) {
    ctx.drawImage(template, 0, 0, ctx.canvas.width, ctx.canvas.height);
    
    const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Break the palette into its colors
    const darkMuted = palette.darkMuted.rgb;
    const darkVibrant = palette.darkVibrant.rgb;
    const lightMuted = palette.lightMuted.rgb;
    const lightVibrant = palette.lightVibrant.rgb;
    const muted = palette.Muted.rgb;
    const vibrant = palette.Vibrant.rgb;
    console.log('Dark Muted: ' + darkMuted)

    for (let y = 17; y <= 573; y++) {
        for (let x = 17; x <= 403; x++) {
            const index = (y * 420 + x) * 4;

            // Check if the pixel is transparent
            if (imageData.data[index + 3] < 140) {
                // Change the color to the darkMuted color
                imageData.data[index] = r;     // Red
                imageData.data[index + 1] = g; // Green
                imageData.data[index + 2] = b; // Blue
                imageData.data[index + 3] = 255; // Alpha
            }
        }
    }

    for (var i = 0; i < imageData.data.length; i += 4) {
        if((imageData.data[i] == 64 &&
           imageData.data[i+1] == 60 &&
           imageData.data[i+2] == 60) ||
            (imageData.data[i] == 159 &&
            imageData.data[i+1] == 157 &&
            imageData.data[i+2] == 157) ||
            (imageData.data[i] == 153 &&
            imageData.data[i+1] == 151 &&
            imageData.data[i+2] == 151) ||
            (imageData.data[i] == 108 &&
            imageData.data[i+1] == 105 &&
            imageData.data[i+2] == 105)
        ){
            imageData.data[i] = darkMuted[0];
            imageData.data[i+1] = darkMuted[1];
            imageData.data[i+2] = darkMuted[2];
        }
    }

    ctx.putImageData(imageData, 0, 0);
    console.log('Template tint drawn');
}

function drawListingData(ctx, data) {
    console.log('Drawing listing data');
    // Implement your drawing logic here
}
