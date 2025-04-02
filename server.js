const express = require('express')
const app = express()
// express 라이브러리 사용하겠다는 뜻

// mongodb 연결 코드
const { MongoClient, ObjectId } = require('mongodb')
// ObjectId 사용가능

const methodOverride = require('method-override')

const session = require('express-session')
const passport = require('passport')
const LocalStrategy = require('passport-local')

const bcrypt = require('bcrypt')

const MongoStore = require('connect-mongo')

app.use(passport.initialize())
app.use(session({
    secret : '암호화에 쓸 비번', // 세션의 document id 는 암호화해서 유저에게 보냄
    resave : false, // 유저가 서버로 요청할 때마다 세션 갱신할건지
    saveUninitialized : false, // 로그인 안해도 세션 만들것인지
    cookie : {maxAge : 60 * 60 * 1000}, // 세션 유지 시간 즉, 유효기간
    store : MongoStore.create({
        mongoUrl : 'mongodb+srv://nodejs1208:james041208@cluster0.dgihutf.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0',
        dbName : 'forum'
    })
}))
app.use(passport.session())

app.use(express.static(__dirname + '/public'))
// 이렇게 server.js 에 넣어주어야 css 쓸 수 있음!

app.set('view engine', 'ejs')
// ejs 사용하기

app.use(express.json())
app.use(express.urlencoded({extended:true}))
// 유저가 데이터를 보내면 서버에서 꺼내서 쓸 수 있도록
// 요청.body

app.use(methodOverride('_method'))


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
    // 응답.sendFile(__dirname + '/index.html')
    // 유저에게 html 파일 보내주려면 sendFile 로 보내주기
    // __dirname 은 server.js가 담긴 폴더의 절대 경로
    응답.render('index.ejs')
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
    if (!요청.isAuthenticated()) {
        return 응답.redirect('/login')
    }
    
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

app.get('/edit/:id', async (요청, 응답) => {
    let result = await db.collection('post').findOne({ _id : new ObjectId(요청.params.id) })
    응답.render('edit.ejs', {posts : result})
})

app.put('/edit', async (요청, 응답) => {
    
    // await db.collection('post').updateOne({ _id : 1 }, {$inc : { like : 1 }}) $mul 는 더하기 $unset 은 필드값 삭제

    // await db.collection('post').updateMany({ like : {$gt : 10} }, {$inc : { like : 1 }}) $gte $lt $lte $ne
    
    try {
        let result = await db.collection('post').updateOne({ _id : new ObjectId(요청.body.id) }, {$set : {title : 요청.body.title, content : 요청.body.content}})
        if (!요청.body.title || !요청.body.content) { // !inputname 해서 비었는지 아닌지 확인가능!
            응답.status(404).send('빈칸 X') // 이렇게 하면 db에 적용되기는 함!
        } else if (result == null){
            응답.status(404).send('id 건드리지 마라')
        }
        
    } catch (e) {
        console.log(e)
        응답.status(404).send('이상하게 입력함')
    }
    
    응답.redirect('/list')
})

app.delete('/delete', async (요청, 응답) => {
    await db.collection('post').deleteOne({ _id : new ObjectId(요청.query.docid) })
    응답.send('삭제완료') // ajax 요청 사용시 응답.rediret 응답.render 사용 안하는게 나음
})

// app.get('/list/1', async (요청, 응답) => {
//     // 1~5번글 찾아서 result 변수에 저장
//     let result = await db.collection('post').find().limit(5).toArray() // limit(5) 하면 위에서 5개만 가져옴
//     응답.render('list.ejs', { posts : result })
// })

// app.get('/list/2', async (요청, 응답) => {
//     // 6~10번글 찾아서 result 변수에 저장
//     let result = await db.collection('post').find().skip(5).limit(5).toArray() // skip(5) 위에서 5개 skip 하고
//     응답.render('list.ejs', { posts : result })
// })

// app.get('/list/3', async (요청, 응답) => {
//     // 11~15번글 찾아서 result 변수에 저장
//     let result = await db.collection('post').find().skip(10).limit(5).toArray()
//     응답.render('list.ejs', { posts : result })
// })

app.get('/list/:id', async (요청, 응답) => {
    let result = await db.collection('post').find().skip((요청.params.id - 1) * 5).limit(5).toArray() // skip 은 수가 클수록 시간이 오래걸림
    응답.render('list.ejs', { posts : result })
})

app.get('/list/next/:id', async (요청, 응답) => {
    // 다음페이지보기
    let result = await db.collection('post')
    .find({_id : {$gt : new ObjectId(요청.params.id) }}) // 조건 입력가능
    .limit(5).toArray() 
    응답.render('list.ejs', { posts : result })
})

app.get('/sign', async (요청, 응답) => {
    응답.render('sign.ejs')
})

app.post('/sign', async (요청, 응답) => { 
    let password_hash = await bcrypt.hash(요청.body.password, 10) // 문자를 얼마나 랜덤화 시킬것인지 (10이 국룰)

    try {
        if (요청.body.username == '') {
            응답.send('아이디 입력해라')
        }

        if (!요청.body.password || 요청.body.password.length < 4) { // 비밀번호 최소 길이
            return 응답.send('비밀번호는 최소 4글자 이상이여야함')
        }

        if (요청.body.password != 요청.body.passwordcheck) { // 비밀번호 확인
            return 응답.send('비밀번호는 똑같아야함')
        }

        const user = await db.collection('user').findOne({username : 요청.body.username}) // 중복 확인
        if (user) {
            return 응답.send('이미 사용 중인 아이디입니다.')
        }

        await db.collection('user').insertOne({username : 요청.body.username, password : password_hash})
        응답.redirect('/')
    } catch (e) {
        console.log(e)
        응답.status(500).send('서버 비상!') 
    }
})

passport.use(new LocalStrategy(async (입력한아이디, 입력한비번, cb) => { // 제출한 아이디/비번 검사
    try {
        let result = await db.collection('user').findOne({username : 입력한아이디})
        if (!result) {
            return cb(null, false, {message : '아이디 DB에 없음'})
        }
        
        if (await bcrypt.compare(입력한비번, result.password)) {
            return cb(null, result)
        } else {
            return cb(null, false, {message : '비번불일치'})
        }
    } catch (e) {
        console.log(e)
    }
}))

passport.serializeUser((user, done) => { // 로그인시 세션 만들기 요청.logIn 쓰면 자동실행
    process.nextTick(() => { // 내부코드를 비동기적으로 처리 (순차적으로 X) 오래걸리면 보류
        done(null, {id : user._id, username : user.username}) // 여기 안에 있는 내용으로 세션 만들어주고 쿠기도 알아서 보내줌
    })
})

passport.deserializeUser( async (user, done) => { // 유저가 보낸 쿠키 분석
    let result = await db.collection('user').findOne({_id : new ObjectId(user.id)}) // 최신 유저 정보 반영
    delete result.password // 비번은 삭제
    process.nextTick(() => {
        done(null, user) // 쿠키 까보고 이상없으면 현재 로그인된 유저정보 알려줌 (요청.user 로 유저 정보 확인을 이 코드 아래서부터 가능)
    })
})
// 특정 api 에서만 실행가능하도록 (시도때도 없이 쿠키 주고받고!)

app.get('/login', async (요청, 응답) => {
    응답.render('login.ejs')
})

app.post('/login', async (요청, 응답, next) => {
    // 위에있는 아이디/비번 비교하는 코드 실행됨
    passport.authenticate('local', (error, user, info) => { // error 에는 에러시에 뭐 들어옴 user 성공시 로그인한 유저정보 info 실패시 이유
        if (error) return 응답.status(500).json(error)
        if (!user) return 응답.status(401).json(info.message)
        요청.logIn(user, (err) =>{
            if (err) return next(err)
            응답.redirect('/') // 로그인 완료시 실행할 코드
        }) 
    })(요청, 응답, next) 
    
})

app.get('/mypage', async (요청, 응답) => {
    if (!요청.isAuthenticated()) {
        return 응답.redirect('/login')
    }
    응답.render('mypage.ejs', {id : 요청.user.username})
})