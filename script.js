const betaElement = document.getElementById('beta');
const alphaElement = document.getElementById('alpha');
const gammaElement = document.getElementById('gamma');
const resetButton = document.getElementById('resetButton');
const startButton = document.getElementById('startButton');
const stopButton = document.getElementById('stopButton');

let initialBeta = 0;
let initialAlpha = 0;
let initialGamma = 0;

let currentBeta = 0;
let currentAlpha = 0;
let currentGamma = 0;

let isFirstOrientation = true;
let isRecording = false;
const recordedData = [];
let recordIntervalId;
const recordInterval = 1000 / 31; // 31フレーム/秒
const smoothingWindow = 5; // 移動平均のウィンドウサイズ

// デバイスの向きが変化したときの処理
window.addEventListener('deviceorientation', (event) => {
    currentBeta = event.beta ? Math.round(event.beta) : 0;   // 前後 (X軸回転) -180 ~ 180
    currentAlpha = event.alpha ? Math.round(event.alpha) : 0; // 方角 (Z軸回転) 0 ~ 360
    currentGamma = event.gamma ? Math.round(event.gamma) : 0; // 左右 (Y軸回転) -90 ~ 90

    if (isFirstOrientation) {
        initialBeta = currentBeta;
        initialAlpha = currentAlpha;
        initialGamma = currentGamma;
        isFirstOrientation = false;
    }

    betaElement.textContent = currentBeta - initialBeta;
    alphaElement.textContent = currentAlpha - initialAlpha;
    gammaElement.textContent = currentGamma - initialGamma;
});

// リセットボタンが押されたときの処理
resetButton.addEventListener('click', () => {
    initialBeta = currentBeta;
    initialAlpha = currentAlpha;
    initialGamma = currentGamma;
});

// ページロード後にリセット機能を実行
window.addEventListener('load', () => {
    resetButton.click();
});

// 記録開始ボタンが押されたときの処理
startButton.addEventListener('click', () => {
    if (!isRecording) {
        isRecording = true;
        recordedData.length = 0; // 既存のデータをクリア
        startButton.disabled = true;
        stopButton.disabled = false;

        recordIntervalId = setInterval(() => {
            recordedData.push({
                beta: currentBeta - initialBeta,
                alpha: currentAlpha - initialAlpha,
                gamma: currentGamma - initialGamma,
            });
        }, recordInterval);
    }
});

// 記録停止ボタンが押されたときの処理
stopButton.addEventListener('click', () => {
    if (isRecording) {
        isRecording = false;
        clearInterval(recordIntervalId);
        startButton.disabled = false;
        stopButton.disabled = true;
        const smoothedData = smoothData(calculateData(recordedData), smoothingWindow);
        downloadCSV(smoothedData);
    }
});

// データの増減値を計算
function calculateData(data) {
    const smoothedData = [];
    
    let pdeltaBeta = 0;
    let pdeltaAlpha = 0;
    let pdeltaGamma = 0;
    for (let i = 0; i < data.length; i++) {
        const beta = data[i].beta;
        const alpha = data[i].alpha;
        const gamma = data[i].gamma;

        if (i > 0) {
            const prevBeta = data[i - 1].beta;
            const prevAlpha = data[i - 1].alpha;
            const prevGamma = data[i - 1].gamma;

            let deltaBeta = beta - prevBeta;
            let deltaAlpha = alpha - prevAlpha;
            let deltaGamma = gamma - prevGamma;

            if (Math.abs(deltaAlpha) > 150) {
                deltaAlpha = 0;
            }

            smoothedData.push({
                beta: pdeltaBeta + deltaBeta,
                alpha: pdeltaAlpha + deltaAlpha,
                gamma: pdeltaGamma + deltaGamma,
            });

            pdeltaBeta += deltaBeta;
            pdeltaAlpha += deltaAlpha;
            pdeltaGamma += deltaGamma;
        }
    }
    return smoothedData;
}


// データの平滑化処理（移動平均）
function smoothData(data, windowSize) {
    if (data.length < windowSize) {
        return data; // データ数がウィンドウサイズより小さい場合は平滑化しない
    }

    const smoothedData = [];
    for (let i = 0; i < data.length; i++) {
        let betaSum = 0;
        let alphaSum = 0;
        let gammaSum = 0;
        let count = 0;

        for (let j = Math.max(0, i - windowSize + 1); j <= i; j++) {
            betaSum += data[j].beta;
            alphaSum += data[j].alpha;
            gammaSum += data[j].gamma;
            count++;
        }

        smoothedData.push({
            beta: betaSum / count,
            alpha: alphaSum / count,
            gamma: gammaSum / count,
        });
    }
    return smoothedData;
}


// CSVダウンロード関数
function downloadCSV(data) {
    if (data.length === 0) {
        alert('記録されたデータがありません。');
        return;
    }

    const csv_data = [
        ['Vocaloid Motion Data 0002'],
        ['カメラ・照明'],
        ['Motion','bone','x','y','z','rx','ry','rz','x_p1x','x_p1y','x_p2x','x_p2y','y_p1x','y_p1y','y_p2x','y_p2y','z_p1x','z_p1y','z_p2x','z_p2y','r_p1x','r_p1y','r_p2x','r_p2y'],
        ['Expression','name','fact'],
        ['Camera','d','a','x','y','z','rx','ry','rz','x_p1x','x_p1y','x_p2x','x_p2y','y_p1x','y_p1y','y_p2x','y_p2y','z_p1x','z_p1y','z_p2x','z_p2y','r_p1x','r_p1y','r_p2x','r_p2y','d_p1x','d_p1y','d_p2x','d_p2y','a_p1x','a_p1y','a_p2x','a_p2y']
    ];

    data.forEach((item, i) => {
        let add_data = [i,0,30,0,10,0,item['beta'],item['alpha'],item['gamma'],20,20,107,107,20,20,107,107,20,20,107,107,20,20,107,107,20,20,107,107,20,20,107,107];
        csv_data.push(add_data);
    });
    
    const csvString = csv_data.map(row => row.join(',')).join('\r\n');

    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'CameraMotionData.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
