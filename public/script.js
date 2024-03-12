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
        if (!data.items) {
            throw new Error('No items available in the response');
        }
        listings = transformAPIToListings(data.items, type);
    })
    .catch(error => console.error('Error fetching user info:', error));
};

 // Correctly map API data to an array of objects.
 function transformAPIToListings(apiData, type) {
    return apiData.map(item => {
        if (type === 'tracks') {
            return {
                id: item.id,
                type: type,
                title: item.name,
                artist: item.artists.map(artist => artist.name).join(', '), 
                image: item.album.images[0].url 
            };
        } else if (type === 'artists') {
            return {
                id: item.id,
                type: type,
                title: item.name,
                image: item.images[0].url 
            };
        }
    });
}

function switchTab(tab) {
    const accessToken = sessionStorage.getItem("spotify_access_token")
    const surface = document.getElementById('surface');
    if(tab===1) {
        populateArray("tracks","long_term", 50, accessToken);
    } else {
        populateArray("artists","long_term", 50, accessToken);
    }
}

