# Netlify 部署說明

## 部署步驟

1. 登入 [Netlify](https://www.netlify.com)
2. 點擊 **Add new site** → **Import an existing project**
3. 選擇 **GitHub** 並授權
4. 選擇此專案 repository
5. 設定：
   - **Build command**：留空
   - **Publish directory**：`.`（根目錄）
6. 點擊 **Deploy site**

## 網址

部署完成後，Netlify 會提供網址，例如：
- `https://chillwashservice.netlify.app`
- 或 `https://隨機名稱.netlify.app`

若需自訂網址（如 chillwashservice.netlify.app）：
- 到 **Site settings** → **Domain management** → **Options** → **Edit site name**
- 將名稱改為 `chillwashservice`

## 注意事項

- **靜態部署**：Netlify 僅部署靜態檔案，後端 API 與管理後台無法使用
- **預約功能**：客戶提交預約時會改為透過 WhatsApp 傳送（已內建備援）
- **管理後台**：需在本機執行 `npm start` 或另行部署後端才能使用
