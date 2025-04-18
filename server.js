const express = require('express')
const app = express()
// express 라이브러리 사용하겠다는 뜻

require('dotenv').config()

// mongodb 연결 코드
const { MongoClient, ObjectId } = require('mongodb')
// ObjectId 사용가능

const methodOverride = require('method-override')

const session = require('express-session')
const passport = require('passport')
const LocalStrategy = require('passport-local')

const bcrypt = require('bcrypt')

const MongoStore = require('connect-mongo')

const { S3Client } = require('@aws-sdk/client-s3')
const multer = require('multer')
const multerS3 = require('multer-s3')
const s3 = new S3Client({
  region : 'ap-northeast-2',
  credentials : {
      accessKeyId : process.env.S3_KEY,
      secretAccessKey : process.env.S3_SECRET
  }
})

const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: 'nodejspractice1208',
    key: function (요청, file, cb) {
      cb(null, Date.now().toString()) //업로드시 파일명 변경가능
    }
  })
})


app.use(passport.initialize())

const sessionMiddleware = session({
    secret : '암호화에 쓸 비번', // 세션의 document id 는 암호화해서 유저에게 보냄
    resave : false, // 유저가 서버로 요청할 때마다 세션 갱신할건지
    saveUninitialized : true, // 로그인 안해도 세션 만들것인지
    cookie : {maxAge : 60 * 60 * 1000}, // 세션 유지 시간 즉, 유효기간
    store : MongoStore.create({
        mongoUrl : 'mongodb+srv://nodejs1208:james041208@cluster0.dgihutf.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0',
        dbName : 'forum'
    })
})
app.use(sessionMiddleware)
app.use(passport.session())


const { createServer } = require('http') // socket.io
const { Server } = require('socket.io')
const server = createServer(app)
const io = new Server(server) 

io.engine.use(sessionMiddleware)

app.use(express.static(__dirname + '/public'))
// 이렇게 server.js 에 넣어주어야 css 쓸 수 있음!

app.set('view engine', 'ejs')
// ejs 사용하기

app.use(express.json())
app.use(express.urlencoded({extended:true}))
// 유저가 데이터를 보내면 서버에서 꺼내서 쓸 수 있도록
// 요청.body

app.use(methodOverride('_method'))

let connectDB = require('./database.js')

let db;
connectDB.then((client) => { // 이렇게 하면 mongodb에 접속
    console.log('DB연결성공') // 접속이 성공하면 forum 이라는 db에 연결해라
    db = client.db('forum');
    server.listen(process.env.PORT, () => {
        console.log('http://localhost:8080 에서 서버 실행중')
    })
    // 서버 띄우는 코드도 여기 안에다 넣기
}).catch((err) => {
    console.log(err) // 에러나면 에러 출력
})


app.use('/list', (요청, 응답, next) => {
    // console.log(new Date())
    next()
})

app.get('/', (요청, 응답) => { // PORT 열기
    // 응답.sendFile(__dirname + '/index.html')
    // 유저에게 html 파일 보내주려면 sendFile 로 보내주기
    // __dirname 은 server.js가 담긴 폴더의 절대 경로
    console.log(요청.user)
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

    const userid = new ObjectId(요청.user.id)

    응답.render('list.ejs', { posts : result, user : userid }) // ejs 는 sendFile 이 아니라 render로!
    // {posts : result}로 object 형식으로 데이터 보내주기
    // 응답은 1개만 가능

    console.log(요청.user)
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

app.post('/add', (요청, 응답) => { // submit 버튼 누르면 post 요청 실행!
    // console.log(요청.body) // 유저가 보낸 데이터 출력가능 (object 형식으로!)

    upload.single('img1')(요청, 응답, async (err) => {
        if (err) return 응답.send('업로드에러')
            try {
                if (요청.body.title == '') {
                    응답.send('제목입력해라')
                } else {
                    await db.collection('post').insertOne({
                        title : 요청.body.title, 
                        content : 요청.body.content, 
                        img : 요청.file ? 요청.file.location : '',
                        user : 요청.user.id,
                        username : 요청.user.username
                    })
                    응답.redirect('/list') // 이렇게 하면 유저를 다른 페이지로 이동가능
                }
            } catch (e) {
                console.log(e) // 에러 메세지 출력
                응답.status(500).send('서버 비상!') // 에러시 에러코드 전송 (500은 서버 잘못으로 인한 에러)
            }
    })
})

app.get('/detail/:id', async (요청, 응답) => { // 유저가 :id 자리에 아무문자나 입력시에 코드 실행
    // 요청.params // :aaa 자리에 입력한거 즉, 유저가 url 에 입력한거 가져와줌

    try {
        let result = await db.collection('post').findOne({ _id : new ObjectId(요청.params.id)})
        let comment_result = await db.collection('comment').find({parent : new ObjectId(요청.params.id)}).toArray()
        // parent id index 만들어 쓰면 좋을듯?
        if (result == null) { // id 길이는 맞을때
            응답.status(404).send('이상한 url 입력함')
        }
        응답.render('detail.ejs', {posts : result, comment : comment_result})
    } catch (e) {
        console.log(e)
        응답.status(404).send('이상한 url 입력함') // 404 는 유저문제!
    }
})

app.post('/detail/:id', async (요청, 응답) => {
    try {
        let parent = await db.collection('post').findOne({ _id : new ObjectId(요청.params.id)}) 
        if (요청.body.comment == '') {
            응답.send('댓글을 입력하세욧')
        } else {
            await db.collection('comment').insertOne({
                comment : 요청.body.comment,
                writerId : 요청.user.id,
                writer : 요청.user.username,
                parent : new ObjectId(parent._id)
            })
            응답.redirect('back') // 이렇게 하면 이전 페이지로 이동시켜줌
        }
    } catch (e) {
        console.log(e)
    }
})

app.get('/edit/:id', async (요청, 응답) => {
    let result = await db.collection('post').findOne({ _id : new ObjectId(요청.params.id) })
    const userid = new ObjectId(요청.user.id)
    const resultid = new ObjectId(result.user)
    if (userid.equals(resultid)) {
        응답.render('edit.ejs', {posts : result})
    } else {
        응답.send('님이 쓴 글 아님')
    }
    
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
    await db.collection('post').deleteOne({
        _id : new ObjectId(요청.query.docid),
        user : 요청.user.id
    })
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

function blank_check(요청, 응답, next) {
    if (!요청.body.username && !요청.body.password) {
        응답.send('빈칸으로 제출하지 말아라')
    } else {
        next()
    }
    
}

app.get('/sign', async (요청, 응답) => {
    응답.render('sign.ejs')
})

app.post('/sign', blank_check, async (요청, 응답) => { 
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

app.post('/login', blank_check, async (요청, 응답, next) => {
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

app.use('/shop', require('./routes/shop.js'))

app.use('/board/sub', require('./routes/sub.js'))

app.post('/search', async (요청, 응답) => {
    // let result = await db.collection('post').find({title : 요청.body.titlename}).toArray() // 전체에서 이거랑 정확히 일치하는거 가져오기
    // let result = await db.collection('post').find({title : { $regex : 요청.body.titlename}}).toArray() 정규식
    // .find 로 정규식 쓰면 많이 느림
    // let result = await db.collection('post').find({$text : { $search : 요청.body.titlename}}).toArray() index
    let 검색조건 = [
        {
            $search : {
                index : 'title_index',
                text : {query : 요청.body.titlename, path : 'title'}
            }
        },
        // { $sort : {  }}, // 검색 결과는 어떻게 정렬할지 _id : 1 하면 id 순으로 정렬
        // { $limit : 10}, // 결과수 제한
        // { $skip : 10}, // 건너뛰기 (limit 과 skip 을 잘 이용해서 페이지네이션 만들기 가능)
        // { $project : { title : 0 }}, 필드 숨기기는 project (title : 0 은 title 필드를 숨겨달라는 거고 1은 보여달라는 뜻)
    ]

    let result = await db.collection('post').aggregate(검색조건).toArray()
    응답.render('search.ejs', {posts : result})
})

// // from 안쓰고 get으로 받는 방법
// app.get('/search', async (요청, 응답) => {
//     let result = await db.collection('post').find({title : 요청.query.val}).toArray()
//     응답.render('search.ejs', {posts : result})
// })

app.post('/invite', async (요청, 응답) => {
    await db.collection('chat_room').insertOne({
        member : [new ObjectId(요청.body.writer), new ObjectId(요청.user.id)],
        date : new Date()
    })
    응답.redirect('/chatlist')
})

app.get('/chatlist', async (요청, 응답) => {
    let result = await db.collection('chat_room').find({member : new ObjectId(요청.user.id)}).toArray()
    console.log(요청.user)
    console.log(JSON.stringify(result))
    응답.render('chat_list.ejs', {chat : result})
})

app.get('/chat/:id', async (요청, 응답) => {
    let result = await db.collection('chat_room').findOne({_id : new ObjectId(요청.params.id)})
    let content = await db.collection('chat_content').find({parentRoom : result._id}).toArray()
    const isMember = result.member.some(m => m.toString() === 요청.user.id.toString())
    if (isMember) {
        응답.render('chatroom', {result : result, chat : content, user : 요청.user.id})
    } else {
        응답.send('권한 없음')
    }
})

io.on('connection', (socket) => { // 유저가 웹소켓 연결 시 서버에서 코드 실행
    console.log('socket!')
    // socket 은 user, io 는 server / on 은 받음 emit 은 전송!
    // socket.on('dataname', (data) => {
    //     io.emit('dataname', '20') // 이렇게 하면 서버가 모든 유저한테 보낼 수 있음
    // })

    // socket.on('ask-join', (data) => {
    //     socket.join(data) // 이렇게 하면 룸 생성 가능! (모든 유저한테 보내는 것을 방지하려고)
    // }) 

    // socket.on('message', (data) => {
    //     io.to(data.room).emit('broadcast', data.msg) // to() 써서 특정 room에만 보내기!
    // })

    // socket.on('broadcast', (data) => { // broadcast 받기!
        
    // })

    socket.on('ask-join', (data) => {
        console.log('connect!')
        if (data.member.includes(socket.request.session.passport.user.id)) {
            socket.join(data._id)
        }
        
    })

    socket.on('message-send', async (data) => {
        console.log('send!')
        await db.collection('chat_content').insertOne({
            parentRoom : new ObjectId(data.room),
            content : data.msg,
            who : new ObjectId(socket.request.session.passport.user.id)
        })
        console.log('user sent : ', data)
        io.to(data.room).emit('message-broadcast', data.msg)
    })
    
})

app.get('/stream/list', (요청, 응답) => {

    응답.writeHead(200, { // 이걸 써서 header 정보 수정가능!
      "Connection": "keep-alive",
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
    });
  
    응답.write('event: msg\n'); // 응답.write 로 유저한테 데이터 쏴주기
    응답.write('data: 바보\n\n');
  
  });