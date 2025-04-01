const express = require('express')
const app = express()
// express 라이브러리 사용하겠다는 뜻


app.use(express.static(__dirname + '/public'))
// 이렇게 server.js 에 넣어주어야 css 쓸 수 있음!

app.set('view engine', 'ejs')
// ejs 사용하기

app.use(express.json())
app.use(express.urlencoded({extended:true}))
// 유저가 데이터를 보내면 서버에서 꺼내서 쓸 수 있도록
// 요청.body


// mongodb 연결 코드
const { MongoClient, ObjectId } = require('mongodb')
// ObjectId 사용가능

let db;
const url = 'mongodb+srv://nodejs1208:james041208@cluster0.dgihutf.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0'
new MongoClient(url).connect().then((client) => { // 이렇게 하면 mongodb에 접속
    console.log('DB연결성공') // 접속이 성공하면 forum 이라는 db에 연결해라
    db = client.db('forum');
    app.listen(8080, () => {
        console.log('http://localhost:8080 에서 서버 실행중')
    })
    // 서버 띄우는 코드도 여기 안에다 넣기
}).catch((err) => {
    console.log(err) // 에러나면 에러 출력
})

app.get('/', (요청, 응답) => { // PORT 열기
    응답.sendFile(__dirname + '/index.html')
    // 유저에게 html 파일 보내주려면 sendFile 로 보내주기
    // __dirname 은 server.js가 담긴 폴더의 절대 경로
})

app.get('/shop', (요청, 응답) => { 
    응답.send('쇼핑 페이지입니다')
    // (요청, 응답) => { 
    // 응답.send('쇼핑 페이지입니다') 이거는 콜백함수!
    
})

app.get('/about', (요청, 응답) => {
    응답.sendFile(__dirname + "/introduce.html")
})

app.get('/news', (요청, 응답) => { // /news에 들어가면 db에 데이터 저장하기
    //db.collection('post').insertOne({title : '어쩌구'}) // post collection에다가 데이터 저장
    응답.send('오늘 비옴')
})

app.get('/list', async (요청, 응답) => { // await을 쓰기 위해 async 붙이기
    let result = await db.collection('post').find().toArray() // post collection에 있는 document 들 출력 (array안의 object 자료형으로)
    // await 은 다음줄 실행하기 전에 기다리라는 뜻 (JS 는 처리가 오래걸리는 코드는 안기다리고 바로 다음줄 실행하기 때문)

    // console.log(result) // 서버에서 console.log 쓰면 터미널에 출력됨
    // console.log(result[0].title) // 첫번째 document 의 제목 출력
    // 응답.send(result[0].title)

    응답.render('list.ejs', { posts : result }) // ejs 는 sendFile 이 아니라 render로!
    // {posts : result}로 object 형식으로 데이터 보내주기
    // 응답은 1개만 가능
})

app.get('/time', (요청, 응답) => {
    응답.render('time.ejs', {time : new Date()})
})

app.get('/write', (요청, 응답) => {
    응답.render('write.ejs')
})

app.post('/add', async (요청, 응답) => { // submit 버튼 누르면 post 요청 실행!
    // console.log(요청.body) // 유저가 보낸 데이터 출력가능 (object 형식으로!)

    try {
        if (요청.body.title == '') {
            응답.send('제목입력해라')
        } else {
            await db.collection('post').insertOne({title : 요청.body.title, content : 요청.body.content})
            응답.redirect('/list') // 이렇게 하면 유저를 다른 페이지로 이동가능
        }
    } catch (e) {
        console.log(e) // 에러 메세지 출력
        응답.status(500).send('서버 비상!') // 에러시 에러코드 전송 (500은 서버 잘못으로 인한 에러)
    }
})

app.get('/detail/:id', async (요청, 응답) => { // 유저가 :id 자리에 아무문자나 입력시에 코드 실행
    // 요청.params // :aaa 자리에 입력한거 즉, 유저가 url 에 입력한거 가져와줌

    try {
        let result = await db.collection('post').findOne({ _id : new ObjectId(요청.params.id)})
        if (result == null) { // id 길이는 맞을때
            응답.status(404).send('이상한 url 입력함')
        }
        응답.render('detail.ejs', {posts : result})
    } catch (e) {
        console.log(e)
        응답.status(404).send('이상한 url 입력함') // 404 는 유저문제!
    }
})