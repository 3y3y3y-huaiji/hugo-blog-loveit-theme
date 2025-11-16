const fs = require('fs');
const path = require('path');

// 读取Hugo生成的JSON文件
const inputFile = path.join(__dirname, '../public/index.json');
const outputFile = path.join(__dirname, '../public/flexsearch/index.json');

// 确保输出目录存在
const outputDir = path.dirname(outputFile);
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

// 读取JSON数据
let data;
try {
    const rawData = fs.readFileSync(inputFile, 'utf8');
    data = JSON.parse(rawData);
    console.log(`已读取 ${data.length} 条记录`);
} catch (error) {
    console.error('读取输入文件失败:', error);
    process.exit(1);
}

// 处理数据，确保所有字段都是字符串
const processedData = data.map(item => ({
    objectID: item.objectID || item.uri,
    uri: item.uri,
    title: item.title || '',
    content: item.content || '',
    date: item.date || '',
    tags: Array.isArray(item.tags) ? item.tags.join(', ') : (item.tags || ''),
    categories: Array.isArray(item.categories) ? item.categories.join(', ') : (item.categories || '')
}));

// 写入FlexSearch索引文件
try {
    fs.writeFileSync(outputFile, JSON.stringify(processedData, null, 2));
    console.log(`FlexSearch索引已生成: ${outputFile}`);
    console.log(`包含 ${processedData.length} 条记录`);
} catch (error) {
    console.error('写入输出文件失败:', error);
    process.exit(1);
}