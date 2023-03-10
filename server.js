const express = require('express');
const app = express();

const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({extended: true})); 


app.set('view engine', 'ejs');

const methodOverride = require('method-override');
app.use(methodOverride('_method'));

const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const session = require('express-session');

app.use(session({secret: '비밀코드', resave: true, saveUninitialized: false})); 
app.use(passport.initialize()); 
app.use(passport.session());




const MongoClient = require('mongodb').MongoClient;

let db;
MongoClient.connect(
  'mongodb+srv://admin:erosto1707@cluster0.pwdd2r0.mongodb.net/?retryWrites=true&w=majority', 
  function(error, client) {
    if(error) return console.error(error);
    db = client.db('todoapp'); 
    app.listen(8080, function() { 
      console.log('listening 8080');
    });
  }
);


app.get('/', function(req, res) { 
  res.sendFile(__dirname + '/index.html');
});

app.get('/write', function(req, res) {
  res.sendFile(__dirname + '/write.html');
});

app.post('/add', function(req, res) { 
  res.send('전송 완료');
  
  db.collection('counter').findOne({name: '게시물갯수'}, function(error, result) { 
    let $totalPost = result.totalPost; 
    console.log(result.totalPost); 
    
    db.collection('post').insertOne( 
      {_id: $totalPost + 1, todo: req.body.title, datetime: req.body.date}, 
      function(error, result) { 
        console.log('저장 완료');
        
        db.collection('counter').updateOne({name: '게시물갯수'}, {$inc: {totalPost: 1}}, function(error, result) {
          if(error) console.error(error);
        });
      }
    ); 
  }); 
}); 


app.get('/list', function(req, res) {
  db.collection('post').find().toArray(function(error, result) {
    console.log(result);
    res.render('list.ejs', {postdata: result}); 
  });
});


app.delete('/delete', function(req, res) {
  console.log(req.body); 
  req.body._id = parseInt(req.body._id); 

  db.collection('post').deleteOne(req.body, function(error, result) {
    console.log('collection 삭제 완료!');
  });
  res.send('삭제 완료'); 
});


app.get('/detail/:id', function(req, res) {
  db.collection('post').findOne({_id: parseInt(req.params.id)}, function(error, result) {
    console.log(result);
    if(!result) {
      return res.send(`<h1>유효하지 않은 URL</h1>`);
    } 
    res.render('detail.ejs', {postdata: result});
  });
});


app.get('/edit/:id', function(req, res) {
  db.collection('post').findOne({_id: parseInt(req.params.id)}, function(error, result) {
    console.log(result);
    if(!result) {
      return res.send(`<h1>유효하지 않은 URL</h1>`);
    } 
    res.render('edit.ejs', {postdata: result});
  });
});


app.put('/edit', function(req, res) {
  db.collection('post').updateOne({_id: parseInt(req.body.id)}, {$set: {todo: req.body.title, datetime: req.body.date}}, function(error, result) {
    console.log('수정 완료');
    res.redirect('/list'); 
  });
});


app.get('/login', function(req, res) {
  res.render('login.ejs');
});

app.post('/login', passport.authenticate('local', {failureRedirect: '/fail'}), function(req, res) { 
  res.redirect('/mypage');
});

passport.use(new LocalStrategy({
  usernameField: 'id',
  passwordField: 'pw',
  session: true,
  passReqToCallback: false 
}, function(입력한아이디, 입력한비번, done) { 
  db.collection('login').findOne({id: 입력한아이디}, function(error, result) {
    if(error) return done(error);

    if(!result) return done(null, false, {message: '존재하지 않는 아이디입니다.'});

    if(입력한비번 === result.pw) {
      return done(null, result);
    } else {
      return done(null, false, {message: '비밀번호가 틀렸습니다.'});
    }
  })
}));

passport.serializeUser(function(user, done) {  
  done(null, user.id);
});

passport.deserializeUser(function(아이디, done) { 
  db.collection('login').findOne({id: 아이디}, function(error, result) {
  done(null, result);
  });
})

app.get('/mypage', loginFn, function(req, res) { 
  console.log(req.user); 
  res.render('mypage.ejs', {사용자: req.user}); 
})

function loginFn(req, res, next) { 
  if(req.user) { 
    next();
  } else {
    res.send(`<h2>로그인 불가</h2>`);
  }
}


app.get('/search', function(req, res) {
  db.collection('post').find({$text: {$search: req.query.value}}).toArray(function(error, result) {
    console.log(result);
    res.render('search.ejs', {postdata: result});
  });
});

