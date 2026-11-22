POLEPOLE CAFE STAFF アプリ

内容
- iPhone向けWebアプリ（ホーム画面追加対応）
- Firebase Authentication（メール/パスワード）
- Firestore共有データ（shared/appData）
- 業務チェック、LINE共有用テキスト、在庫入出庫・販売減算、仕込み、マニュアル、共有ノート、記録
- 在庫管理(5).xlsx と ポレポレカフェマニュアル(4).xlsx から商品・在庫・レシピ・マニュアル項目を取り込み

重要
1. Firebase Authentication の Email/Password を有効にしてください。
2. Firestoreルールは /shared/{document} の read/write をログイン必須にしてください。
3. このアプリは shared/appData という1ドキュメントに共有状態を保存します。
4. 現在のルールが shared/{document} のみ許可ならこの構成で利用できます。
5. 公開にはHTTPS対応の静的ホスティングが必要です。Firebase Hosting CLIによるデプロイはPC/ターミナルが必要です。ZIP自体は公開済みサイトではありません。
6. FirebaseのAPIキーはクライアント用識別子です。公開前にFirebase ConsoleでAPIキーの利用制限を設定し、Firestoreルールを再確認してください。

公開ファイル：index.html / app.js / data.json / style.css / manifest.json
