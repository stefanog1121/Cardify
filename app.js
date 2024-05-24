import fetch from 'node-fetch';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import querystring from 'querystring'
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const client_id = '76ac354972dd41a0a1c8fa69608fac18';
const client_secret = '3ee0101593134a9d953f99de16ca6e45'; 
const redirect_uri = 'http://localhost:8080/callback';

// Code Verifier
const generateRandomString = function (length) { 
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
};

let stateKey = 'spotify_auth_state'; // Cookie Name

let app = express();

app.use(express.static(__dirname + '/public'))

    .use(cors())
    .use(cookieParser());

// Watch for Login button press on HTML page
app.get('/login', function (req, res) { 

    let state = generateRandomString(16);
    res.cookie(stateKey, state); 

// Request authorization + Automatic redirect to callback
    const scope = 'user-top-read user-read-private user-read-email ';
    res.redirect('https://accounts.spotify.com/authorize?' +
        querystring.stringify({
            response_type: 'code',
            client_id: client_id,
            scope: scope,
            redirect_uri: redirect_uri,
            state: state,
            show_dialog: true
        }));
});

app.get('/callback', function (req, res) {

// Request refresh and access tokens after comparing states

    let code = req.query.code || null;
    let state = req.query.state || null;
    let storedState = req.cookies ? req.cookies[stateKey] : null;

    if (state === null || state !== storedState) {
        res.redirect('/#' +
            querystring.stringify({
                error: 'state_mismatch'
            }));
    } else {
        res.clearCookie(stateKey);

        const authOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': 'Basic ' + (Buffer.from(client_id + ':' + client_secret).toString('base64'))
            },
            body: querystring.stringify({
                code: code,
                redirect_uri: redirect_uri,
                grant_type: 'authorization_code'
            })
        };

        fetch('https://accounts.spotify.com/api/token', authOptions)
            .then(response => response.json()) // Convert the response to JSON
            .then(data => {
                if (data.access_token) {
                    let access_token = data.access_token;
                    let refresh_token = data.refresh_token;

                    // Set a timer to refresh the token every hour (3500 seconds to be a bit before an hour)
                    setTimeout(function refreshAccessToken() {
                        refreshSpotifyToken(refresh_token, () => {
                            setTimeout(refreshAccessToken, 3500 * 1000); // Refresh token every 3500 seconds
                        });
                    }, 3500 * 1000);

                    res.redirect('/#' +
                        querystring.stringify({
                            access_token: access_token,
                            refresh_token: refresh_token
                        }));
                } else {
                    res.redirect('/#' +
                        querystring.stringify({
                            error: 'invalid_token'
                        }));
                }
            })
            .catch(error => {
                console.error(error);
                res.redirect('/#' +
                    querystring.stringify({
                        error: 'invalid_request'
                    }));
            });
    }
});

function refreshSpotifyToken(refresh_token, callback) {
    const authOptions = {
        method: 'POST',
        headers: {
            'Authorization': 'Basic ' + (Buffer.from(client_id + ':' + client_secret).toString('base64')),
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `grant_type=refresh_token&refresh_token=${refresh_token}`,
    };

    fetch('https://accounts.spotify.com/api/token', authOptions)
        .then(response => response.json())
        .then(data => {
            if (data.access_token) {
                console.log('The access token has been successfully refreshed.');
                callback(data.access_token);
            }
        })
        .catch(error => {
            console.error('Error refreshing access token', error);
        });
}

console.log('Listening on 8080: http://localhost:8080/');
app.listen(8080);