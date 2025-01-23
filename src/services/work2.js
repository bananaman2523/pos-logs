self.onmessage = function (e) {
    const { content } = e.data;
    const processedLogs = processLogs(content);
    const logsWithId = processedLogs.map((log, index) => ({
        ...log,
        id: index + 1,
    }));

    postMessage({ logs: logsWithId });
};

function processLogs(content) {
    const structuredLogRegex = /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) : \[([A-Z]+)\] \[([^\]]+)\] (.*)$/;
    const unstructuredLogRegex = /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) : (.+)$/;
    const filteredLogs = [];

    let count = 0;
    let foundFirstMatch = false;

    const lines = content.split('\n').reverse();

    lines.forEach(line => {

        const structuredMatch = line.match(structuredLogRegex);
        if (structuredMatch) {
            const [, timestamp, level, category, message] = structuredMatch;
            if (category === 'VIVIPOS' && (message.includes('SHUTDOWN') || message.includes('RESTART'))) {
                filteredLogs.push({
                    timestamp,
                    level,
                    message: `[${category}] ${message}`,
                });
                count = 0;
                foundFirstMatch = true;
            } else if (foundFirstMatch && count < 20) {
                filteredLogs.push({
                    timestamp,
                    level,
                    message: `[${category}] ${message}`,
                });
                count++;
            }
        } else {
            const unstructuredMatch = line.match(unstructuredLogRegex);
            if (unstructuredMatch) {
                if (foundFirstMatch && count < 20) {
                    const [, timestamp, message] = unstructuredMatch;
                    filteredLogs.push({
                        timestamp,
                        level: '',
                        message,
                    });
                    count++;
                }

            }
        }
    });

    return filteredLogs.reverse();
}
