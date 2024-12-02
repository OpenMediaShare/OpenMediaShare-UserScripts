// ==UserScript==
// @name        OpenMediaCenter Youtube Provider
// @namespace   Violentmonkey Scripts
// @match       https://www.youtube.com/*
// @grant       GM.xmlhttpRequest
// @version     1.0
// @author      -
// @description 11/29/2024, 9:03:18 PM
// ==/UserScript==

const videoTitleLookup = '#above-the-fold #title .style-scope .ytd-watch-metadata';
const videoCreatorLookup = '#above-the-fold #channel-name';
const videoPfpLookup = '#above-the-fold #avatar #img';
const loadTime = Date.now();

let videoMetadata: VideoMetadata = {
    data: {
        creator: '',
        title: '',
        views: '',
        likes: '',
        thumbnail: '',
        thumbnail2: null,
        url: '',
        playerState: 'unknown'
    },
    time: {
        curruntTime: 0,
        totalTime: 0,
        timePercent: 0,
        formattedTime: '0w0',
    },
    auth: {
        name: 'Youtube Userscript',
        uuid: crypto.randomUUID(),
        service: 'youtubeUserscript'
    }
}

declare namespace GM {
    function xmlhttpRequest(object: {method: string,url: string,'headers': object,data: string, responseType: string}): void
}

const elementLoadClock = setInterval(() => {
    if (document.querySelector(videoTitleLookup) !== null && document.querySelector('#movie_player video') !== null && getComputedStyle(document.querySelector('.watch-root-element')).display !== 'none' && document.querySelector('#above-the-fold #info span:first-child') !== null) {
        clearInterval(elementLoadClock);
        onReady();
        
    }
}, 500)

function onReady() {
    const diff = (Date.now() - loadTime);
    console.log(`%cOpenMediaShare Ready In ${diff}ms`,'font-size:48px');
    const response = GM.xmlhttpRequest({
        method: 'POST',
        url: 'http://localhost:9494/api/auth/openSession',
        headers: {
            'Content-Type': 'application/json'
        },
        data: JSON.stringify(videoMetadata.auth),
        responseType: 'json'
    })
    videoMetadata.data = {
        ...videoMetadata.data,
        title: (document.querySelector(videoTitleLookup) as HTMLElement).innerText,
        creator: (document.querySelector(videoCreatorLookup) as HTMLElement).innerText,
        thumbnail: `https://img.youtube.com/vi/${location.href.split('watch?v=')[1].split('&')[0]}/hqdefault.jpg`,
        thumbnail2: (document.querySelector(videoPfpLookup) as HTMLImageElement).src,
        url: location.href,
        likes: (document.querySelector('like-button-view-model') as HTMLElement)?.innerText,
        views: (document.querySelector('#above-the-fold #info span:first-child') as HTMLElement).innerText.split(' views')[0],
    }


    // current video
    const response2 = GM.xmlhttpRequest({
        method: 'POST',
        url: 'http://localhost:9494/api/media/all',
        headers: {
            'Content-Type': 'application/json'
        },
        data: JSON.stringify(videoMetadata),
        responseType: 'json'
    })
    console.log(videoMetadata.data);
    const video = (document.querySelector('video') as HTMLVideoElement);
    video.onprogress = onTimeUpdate;
    video.onplay = (e) => {onPlayerStateUpdate('playing')}
    video.onpause = (e) => {onPlayerStateUpdate('paused')}
    // pagehide and unload don't fire before GM is killed in a fire, so we have to use beforeunload even tho its use for something like this is not great.
    window.addEventListener('beforeunload',(e) => {

        GM.xmlhttpRequest({
            method: 'DELETE',
            url: 'http://localhost:9494/api/auth/closeSession',
            headers: {
                'Content-Type': 'application/json'
            },
            data: JSON.stringify(videoMetadata),
            responseType: 'json',
            
        })
    
    })
}



/**
 *
 * @param {ProgressEvent} e
 */
function onTimeUpdate(e){

    const _tTime = e.target.duration;
    const _cTime = e.target.currentTime;
    const fct = secondsToFormat(_cTime); //formated current time
    const ftt = secondsToFormat(_tTime); //formated total time

    // console.log(videoMetadata.auth.uuid);
    // console.log(document.querySelector(videoTitleLookup).innerText);
    // console.log(document.querySelector(videoCreatorLookup).innerText);
    console.log(`${fct[0]}:${fct[1]} / ${ftt[0]}:${ftt[1]}`);


    videoMetadata.data = {
        ...videoMetadata.data,
        title: (document.querySelector(videoTitleLookup) as HTMLElement).innerText,
        creator: (document.querySelector(videoCreatorLookup) as HTMLElement).innerText,
        thumbnail: `https://img.youtube.com/vi/${location.href.split('watch?v=')[1].split('&')[0]}/hqdefault.jpg`,
        thumbnail2: (document.querySelector(videoPfpLookup) as HTMLImageElement).src,
        url: location.href,
        likes: (document.querySelector('like-button-view-model') as HTMLElement)?.innerText,
        views: (document.querySelector('#above-the-fold #info span:first-child') as HTMLElement).innerText.split(' views')[0],
    }

    videoMetadata.time = {
        'curruntTime': _cTime,
        'totalTime': _tTime,
        'timePercent': (_cTime / _tTime) * 100,
        'formattedTime': `${fct[0]}:${fct[1]} / ${ftt[0]}:${ftt[1]}`
    };

    const response = GM.xmlhttpRequest({
        method: 'POST',
        url: 'http://localhost:9494/api/media/all',
        headers: {
            'Content-Type': 'application/json'
        },
        data: JSON.stringify(videoMetadata),
        responseType: 'json'
    })
}



function onPlayerStateUpdate(playerState: PlayerState){
    videoMetadata.data.playerState = playerState;
    GM.xmlhttpRequest({
        method: 'POST',
        url: 'http://localhost:9494/api/auth/main',
        headers: {
            'Content-Type': 'application/json'
        },
        data: JSON.stringify(videoMetadata),
        responseType: 'json'
    })
    GM.xmlhttpRequest({
        method: 'POST',
        url: 'http://localhost:9494/api/controls/status',
        headers: {
            'Content-Type': 'application/json'
        },
        data: JSON.stringify(videoMetadata),
        responseType: 'json'
    })

    
}

function onUnload(){

}


function secondsToFormat(seconds: number) {
    const m = Math.round(Math.floor(seconds / 60));
    let s: string | number = Math.round(seconds - m * 60);
    if (s < 10) { s = `0${s}`; }
    return [m, s];
}
