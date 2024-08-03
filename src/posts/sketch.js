
const scene_size = 1024;
const tile_count = 30;
const tile_size = scene_size / tile_count;
const canvas_padding = tile_size * 2;
const canvas_size = scene_size + canvas_padding * 2;

const theme = {
  bg_h: "#1d2021",
  bg: "#282828",
  bg_s: "#32302f",
  bg1: "#3c3836",
  bg2: "#504945",
  bg3: "#665c54",
  bg4: "#7c6f64",
  fg: "#fbf1c7",
  fg1: "#ebdbb2",
  fg2: "#d5c4a1",
  fg3: "#bdae93",
  fg4: "#a89984",

  red: "#fb4934",
  green: "#b8bb26",
  yellow: "#fabd2f",
  blue: "#83a598",
  purple: "#d3869b",
  aqua: "#8ec07c",
  gray: "#928374",
  orange: "#fe8019",

  red_dim: "#cc2412",
  green_dim: "#98971a",
  yellow_dim: "#d79921",
  blue_dim: "#458588",
  purple_dim: "#b16286",
  aqua_dim: "#689d6a",
  gray_dim: "#a89984",
  orange_dim: "#d65d0e",
};

function setup() {
  theme.camera = theme.aqua;
  theme.frustum = theme.orange;

  createCanvas(canvas_size, canvas_size);
  frameRate(30);
}

let timer = 0;

function draw_tiles(check_adjacent, limit) {}

function point_in_triangle(px, py, ax, ay, bx, by, cx, cy) {
  function area(x1, y1, x2, y2, x3, y3) {
    return abs((x1 * (y2 - y3) + x2 * (y3 - y1) + x3 * (y1 - y2)) / 2.0);
  }

  const areaABC = area(ax, ay, bx, by, cx, cy);
  const areaPBC = area(px, py, bx, by, cx, cy);
  const areaPAC = area(ax, ay, px, py, cx, cy);
  const areaPAB = area(ax, ay, bx, by, px, py);

  return abs(areaABC - (areaPBC + areaPAC + areaPAB)) < 0.001;
}

function rotate_point(x, y, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const newX = x * cos - y * sin;
  const newY = x * sin + y * cos;
  return { x: newX, y: newY };
}

function draw() {
  timer++;

  background(theme.bg);

  push();
  {
    translate(canvas_padding / 2, canvas_size - canvas_padding / 2);

    stroke(theme.red);
    fill(theme.red);
    line(0, 0, 32, 0);
    triangle(32, -4, 32, 4, 32+8, 0);

    noStroke();
    textSize(20)
    textAlign(LEFT, CENTER);
    text("+X",32 + 16, 0);

    stroke(theme.blue);
    fill(theme.blue);
    line(0, 0, 0, -32);
    triangle(-4, -32, 4, -32, 0, -40);

    noStroke();
    textAlign(CENTER, BOTTOM);
    text("+Z", 0, -40 - 4);

    translate(512-64, 0);

    noStroke();
    fill(theme.camera);
    circle(0, -8, 8);
    textAlign(CENTER, CENTER);
    text("camera origin", 0, 8);

    translate(120, 0);
    stroke(theme.frustum);
    noFill();
    triangle(0, -2, -10, -16, 10, -16);

    noStroke();
    fill(theme.frustum);
    text("frustum", 0, 8);
    
    translate(64,0)
    fill(theme.fg1)
    textAlign(LEFT,CENTER)
    text("note: different tiles are highlighted in orange", 0, 0)
  }
  pop();

  let frustum_angle = timer / 100;
  let frustum_cos = cos(frustum_angle);
  let frustum_sin = sin(frustum_angle);

  let frustum_p1 = rotate_point(0, -384, frustum_angle - PI / 4);
  let frustum_p2 = rotate_point(0, -384, frustum_angle + PI / 4);

  push();
  {
    translate(canvas_padding, canvas_padding);
    strokeWeight(2)
    stroke(theme.fg4);
    noFill();

    for (let z = 0; z < tile_count; z++) {
      for (let x = 0; x < tile_count; x++) {
        let _x = x * tile_size;
        let _z = z * tile_size;

        let dx = _x - scene_size / 2;
        let dz = _z - scene_size / 2;

        let visible = point_in_triangle(
          dx,
          dz + tile_size-1,
          0,
          0,
          frustum_p1.x,
          frustum_p1.y,
          frustum_p2.x,
          frustum_p2.y
        );

        let visible2 =
          point_in_triangle(
            dx + tile_size - 1,
            dz,
            0,
            0,
            frustum_p1.x,
            frustum_p1.y,
            frustum_p2.x,
            frustum_p2.y
          ) ||
          point_in_triangle(
            dx,
            dz + tile_size - 1,
            0,
            0,
            frustum_p1.x,
            frustum_p1.y,
            frustum_p2.x,
            frustum_p2.y
          ) ||
          point_in_triangle(
            dx + tile_size - 1,
            dz + tile_size - 1,
            0,
            0,
            frustum_p1.x,
            frustum_p1.y,
            frustum_p2.x,
            frustum_p2.y
          );

        if (visible) {
          fill(theme.fg2);
        } else if (visible2) {
          fill(theme.yellow)
        } else {
          noFill();
        }

        rect(_x, _z, tile_size, tile_size);
      }
    }

    push();
    {
      translate(scene_size / 2, scene_size / 2)

      stroke(theme.frustum);
      strokeWeight(2)
      noFill();
      triangle(0, 0, frustum_p1.x, frustum_p1.y, frustum_p2.x, frustum_p2.y);
      
      
      noStroke();
      fill(theme.camera);
      circle(0, 0, 8);
    }
    pop();
    
    push()
    {
      translate(scene_size/2, -canvas_padding/2)
      textSize(24)
      noStroke()
      fill(theme.fg1)
            textAlign(CENTER, BOTTOM)
      text("Frustum Lookup Table", 0, 0)
      textAlign(CENTER,TOP)
      textSize(16)
      text("pitch = 0, new method", 0,6)
    }
    pop()
  }
  pop();
}
