const fs = require('fs');
const readline = require('readline');
const path = require('path');

async function splitLogByDay(inputFilePath, outputFolder) {
    if (!fs.existsSync(outputFolder)) {
        fs.mkdirSync(outputFolder, { recursive: true });
    }

    if (!fs.existsSync(inputFilePath)) {
        console.error(`ไม่พบไฟล์ต้นทาง: ${inputFilePath}`);
        return;
    }

    const readStream = fs.createReadStream(inputFilePath, 'utf8');
    const rl = readline.createInterface({
        input: readStream,
        terminal: false
    });

    const dailyLogs = {};
    const timestampPattern = /^\d{4}-\d{2}-\d{2}/;

    let currentDate = null;
    let previousLine = '';

    rl.on('line', (line) => {
        const match = line.match(timestampPattern);
        if (match) {
            const dateStr = match[0];
            if (!dailyLogs[dateStr]) {
                dailyLogs[dateStr] = [];
            }

            if (previousLine.trim()) {
                dailyLogs[currentDate]?.push(previousLine.trim());
            }
            currentDate = dateStr;
            previousLine = line;
        } else {

            previousLine += ` ${line.trim()}`;
        }
    });

    rl.on('close', async () => {
        try {

            if (previousLine.trim()) {
                dailyLogs[currentDate]?.push(previousLine.trim());
            }

            for (const date in dailyLogs) {
                const outputFilePath = path.join(outputFolder, `${date}.log`);
                fs.writeFileSync(outputFilePath, dailyLogs[date].join('\n'), 'utf8');
                console.log(`ไฟล์ log สำหรับวันที่ ${date} ถูกสร้างแล้วที่ ${outputFilePath}`);
            }

            console.log("กระบวนการทั้งหมดเสร็จสมบูรณ์!");
        } catch (err) {
            console.error(`เกิดข้อผิดพลาดระหว่างการเขียนหรือบีบอัดไฟล์: ${err.message}`);
        }
    });

    rl.on('error', (err) => {
        console.error(`เกิดข้อผิดพลาดระหว่างการอ่านไฟล์: ${err.message}`);
    });
}


const inputFilePath = './FileMain/vivipos.log';
const outputFolder = './Result';
splitLogByDay(inputFilePath, outputFolder);
