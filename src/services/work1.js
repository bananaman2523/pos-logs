self.onmessage = function (e) {
    const { content } = e.data;
    const processedLogs = processLogs(content);

    postMessage({ logs: processedLogs });
};

function processLogs(content) {
    const logRegex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} : \[[A-Z]+\] \[.*\]/;
    const filteredLogs = [];

    const lines = content.split('\n');
    let currentLog = null;

    lines.forEach((line, idx) => {
        if (logRegex.test(line)) {
            const regex = /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) : \[([A-Z]+)\] \[([^\]]+)\] (.*)$/;
            const match = line.match(regex);
            if (match) {
                const [, timestamp, level, category, message] = match;

                if (category === 'alley_mobile_redeem') {
                    const objectStartIdx = idx + 1;
                    const objectLines = [];
                    let foundEnd = false;

                    for (let i = objectStartIdx; i < lines.length; i++) {
                        const objLine = lines[i].trim();
                        if (objLine === '}') {
                            foundEnd = true;
                            break;
                        }
                        if (objLine.length > 0) {
                            objectLines.push(objLine);
                        }
                    }

                    const details = objectLines.length > 0 ? parseObjectDetails(objectLines.join('\n')) : null;

                    filteredLogs.push({
                        timestamp,
                        level,
                        message: `[${category}] ${message}`,
                        details: details || 'No details'
                    });
                } else {
                    filteredLogs.push({
                        timestamp,
                        level,
                        message: `[${category}] ${message}`,
                        details: 'No details'
                    });
                }
            }
        }
    });

    return filteredLogs;
}

function containsXML(line) {
    const xmlPattern = /<\?xml.*\?>|<.*?>/;
    return xmlPattern.test(line);
}

function parseObjectDetails(objectStr) {
    try {
        let formattedObject = objectStr.replace(/'/g, '"');

        formattedObject = formattedObject.replace(/([a-zA-Z0-9_]+)(?=\s*:)/g, '"$1"');

        return formattedObject
    } catch (error) {
        return `Invalid object format: ${error.message}`;
    }
}
