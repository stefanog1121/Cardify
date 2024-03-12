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
        fetchUserInfo(tokens.access_token);

        
        window.history.pushState("", document.title, window.location.pathname + window.location.search);
    }

    document.getElementById('spotifyLogin').addEventListener('click', function() {
        window.location.href = '/login'; 
    });
});

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