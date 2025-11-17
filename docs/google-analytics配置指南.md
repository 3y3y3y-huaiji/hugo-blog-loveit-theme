# Google Analytics配置指南

## 获取Google Analytics跟踪ID

1. 访问 [Google Analytics](https://analytics.google.com/) 并登录您的Google账户
2. 点击"开始测量"按钮
3. 填写账户名称（如"我的博客"）
4. 创建媒体资源（网站），填写网站名称、URL等信息
5. 选择行业类别和报告时区
6. 创建数据流，选择"Web"平台
7. 输入网站URL和流名称
8. 启用"增强型衡量功能"
9. 创建流后，您将获得一个以"G-"开头的测量ID（如"G-XXXXXXXXXX"）

## 配置Hugo博客

1. 将获得的测量ID替换到`hugo.toml`文件中的`[params.analytics.google.id]`字段
2. 如果您想在本地开发环境中也启用Google Analytics，将`localhost`设置为`true`
3. 重新构建并部署您的网站

## 验证配置

1. 访问您的网站
2. 在Google Analytics的"实时"报告中查看是否有访问数据
3. 如果看到数据，说明配置成功

## 注意事项

- Google Analytics需要24-48小时才能在报告中显示完整数据
- 请确保您的网站符合隐私政策和GDPR要求
- 如果您的网站主要面向中国用户，可能需要考虑使用百度统计等替代方案