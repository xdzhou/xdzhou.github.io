/*BIRD**********************************************************************/
class Bird {
  static GRAVITY = 0.3;
  static JUMP = -6;

  constructor(y) {
    this.y = y;
    this.speed = 0;
    this.alive = true;
    this.score = 0;
  }

  flap() {
    this.speed = Bird.JUMP;
  }

  update() {
    this.speed += Bird.GRAVITY;
    this.y += this.speed;
  }

  isOut(canvasHeight) {
    return ((this.y < 0) || (this.y > canvasHeight));
  }

  markAsDead(score) {
    this.alive = false;
    this.score = score;
  }
}

/*PIPE**********************************************************************/
class Pipe {
  static WIDTH = 50;
  static AISLE_HEIGHT = 130;

  constructor(rightX, canvasHeight) {
    this.rightX = rightX;
    this.topLen = (canvasHeight - Pipe.AISLE_HEIGHT) * Math.random();
  }

  update() {
    this.rightX -= 3;
  }

  isOut() {
    return this.rightX < 0;
  }

  justPass(posX) {
    return (this.rightX < posX) && (posX <= (this.rightX + 3));
  }

  //detect whether bird touch this pipe
  touch(topLeftX, topLeftY, width, height) {
    var untouchX = (topLeftX + width < this.rightX - Pipe.WIDTH || topLeftX > this.rightX);
    if (untouchX) {
      return false;
    }
    var untouchY = (topLeftY > this.topLen && topLeftY + height < this.topLen + Pipe.AISLE_HEIGHT);
    return !untouchY;
  }
}

/*FLAPPY GUI**********************************************************************/
class FlappyGui {
  static BIRD_X = 150;
  static PIPE_INTERVAL = 200;

  constructor(canvas, images) {
    this.backgroundSpeed = 0.5;

    this.maxScore = 0;
    this.generation = 0;

    this.images = images;
    this.ctx = canvas.getContext("2d");
    this.width = canvas.width;
    this.height = canvas.height;
  }

  reset(birdsCount) {
    this.birds = [];
    this.pipes = [];
    this.score = 0;
    this.step = 0;
    this.alive = birdsCount;

    this.pipes.push(new Pipe(this.width, this.height));
    this.backgroundx = 0;
    for (var i = 0; i < birdsCount; i++) {
      this.birds.push(new Bird(this.height / 2));
    }
  }

  update(birdFlapFun, restartCallack) {
    this.step++;
    this.backgroundx += this.backgroundSpeed;
    // update pipes
    for (var i = 0; i < this.pipes.length; i++) {
      this.pipes[i].update();
      if (this.pipes[i].isOut()) {
        this.pipes.splice(i, 1);
        i--;
      } else if (this.pipes[i].justPass(FlappyGui.BIRD_X)) {
        this.score++;
        this.maxScore = Math.max(this.score, this.maxScore);
      }
    }
    var lastPipe = this.pipes[this.pipes.length - 1];
    var nextPipeX = lastPipe.rightX + FlappyGui.PIPE_INTERVAL;
    if (nextPipeX < this.width) {
      this.pipes.push(new Pipe(nextPipeX + Pipe.WIDTH, this.height));
    }
    // updates birds
    var nearPipe;
    for (var pipe of this.pipes) {
      if (pipe.rightX > FlappyGui.BIRD_X) {
        nearPipe = pipe;
        break;
      }
    }

    var aliveCount = 0;
    var birdImg = this.images.bird;
    var toPipeDis = nearPipe.rightX - Pipe.WIDTH - (FlappyGui.BIRD_X + birdImg.width);
    for (var i = 0; i < this.birds.length; i++) {
      var bird = this.birds[i];
      if (!bird.alive) {
        continue;
      }
      if (birdFlapFun(i, [toPipeDis, bird.y - nearPipe.topLen, nearPipe.topLen + Pipe.AISLE_HEIGHT - bird.y - birdImg.height])) {
        bird.flap();
      }
      bird.update();
      if (bird.isOut(this.height) || nearPipe.touch(FlappyGui.BIRD_X, bird.y, birdImg.width, birdImg.height)) {
        bird.markAsDead(this.step);
      } else {
        aliveCount++;
      }
    }
    this.alive = aliveCount;
    if (aliveCount === 0) {
      console.log("generation " + this.generation + " finished with score " + this.score);
      this.generation++;
      restartCallack(this.birds);
    }
    var self = this;
    if (FPS === 0) {
      setZeroTimeout(() => self.update(birdFlapFun, restartCallack));
    } else {
      setTimeout(() => self.update(birdFlapFun, restartCallack), 1000 / FPS);
    }
  }

  render() {
    this.ctx.clearRect(0, 0, this.width, this.height);
    // draw background
    var bgImage = this.images.background;
    for (var i = 0; i < Math.ceil(this.width / bgImage.width) + 1; i++) {
      this.ctx.drawImage(bgImage, i * bgImage.width - Math.floor(this.backgroundx % bgImage.width), 0);
    }
    // draw pipe
    for (var pipe of this.pipes) {
      var pipeTop = this.images.pipetop;
      this.ctx.drawImage(pipeTop, pipe.rightX - Pipe.WIDTH, pipe.topLen - pipeTop.height, Pipe.WIDTH, pipeTop.height);
      var pipeBottom = this.images.pipebottom;
      this.ctx.drawImage(pipeBottom, pipe.rightX - Pipe.WIDTH, pipe.topLen + Pipe.AISLE_HEIGHT, Pipe.WIDTH, pipeBottom.height);
    }
    // draw bird
    for (var bird of this.birds) {
      if (bird.alive) {
        this.ctx.drawImage(this.images.bird, FlappyGui.BIRD_X, bird.y);
      }
    }
    this.ctx.fillStyle = "white";
    this.ctx.font = "20px Oswald, sans-serif";
    this.ctx.fillText("Generation : " + this.generation, 10, 25);
    this.ctx.fillText("Score : " + this.score, 10, 50);
    this.ctx.fillText("Max Score : " + this.maxScore, 10, 75);
    this.ctx.fillText("Alive/Total : " + this.alive + " / " + this.birds.length, 10, 100);

    var self = this;
    requestAnimationFrame(() => self.render());
  }
}

/*GAME**********************************************************************/
class FlappyGame {
  constructor(conf, layoutCounts, canvas, images) {
    this.conf = conf;
    this.networks = [];
    this.gui = new FlappyGui(canvas, images);
    this.gui.reset(conf.population);
    for (var i = 0; i < conf.population; i++) {
      this.networks.push(new Network(NetworkData.withLayerCounts(layoutCounts)));
    }
  }

  start() {
    var self = this;
    this.gui.update((a, b) => self.birdNeedFlap(a, b), (s) => self.restart(s));
    this.gui.render();
  }

  birdNeedFlap(birdIndex, inputs) {
    return this.networks[birdIndex].compute(inputs)[0] > 0.5;
  }

  restart(birds) {
    this.gui.reset(this.conf.population);
    this.upgrade2nextGeneration(birds);
  }

  upgrade2nextGeneration(birds) {
    var genomes = [];
    for (var i = 0; i < this.conf.population; i++) {
      genomes.push(new Genome(birds[i].score, this.networks[i].toData()));
    }
    var nextGen = new Generation(genomes).nextGeneration(this.conf);
    this.networks = [];
    for (var genome of nextGen.genomes) {
      this.networks.push(new Network(genome.data));
    }
  }
}


(function () {
  var timeouts = [];
  var messageName = "zero-timeout-message";

  function setZeroTimeout(fn) {
    timeouts.push(fn);
    window.postMessage(messageName, "*");
  }

  function handleMessage(event) {
    if (event.source == window && event.data == messageName) {
      event.stopPropagation();
      if (timeouts.length > 0) {
        var fn = timeouts.shift();
        fn();
      }
    }
  }

  window.addEventListener("message", handleMessage, true);

  window.setZeroTimeout = setZeroTimeout;
})();

var FPS = 60;
var speed = function (fps) {
  FPS = parseInt(fps);
};

window.onload = function () {
  var conf = new GeneticConf({population: 20, generateChildCount: 3});
  var canvas = document.getElementById("flappy");
  var imageSrc = {
    bird: "./img/bird.png",
    background: "./img/background.png",
    pipetop: "./img/pipetop.png",
    pipebottom: "./img/pipebottom.png"
  };
  var images = {};
  var nb = 0;
  var loaded = 0;
  for (name in imageSrc) {
    nb++;
    images[name] = new Image();
    images[name].src = imageSrc[name];
    images[name].onload = function () {
      loaded++;
      if (nb === loaded) {
        var game = new FlappyGame(conf, [3, 2, 1], canvas, images);
        //game.userMode();
        game.start();
      }
    };
  }
};