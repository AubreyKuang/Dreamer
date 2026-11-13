"""Serve an instrumented copy of Dreamer for rendering measurements."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import argparse
import tempfile

HERE = Path(__file__).resolve().parent

def instrument(source, before, after):
    if source.count(before) != 1:
        raise ValueError(f"Expected one instrumentation point: {before[:80]}")
    return source.replace(before, after, 1)

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8002)
    args = parser.parse_args()
    game = HERE.parent
    page = (game / "index.html").read_text()
    page = instrument(page, '<script src="js/core.js">', '<script src="benchmark.js"></script>\n<script src="js/core.js">')
    render = (game / "js/render.js").read_text()
    landscape = (game / "js/landscape.js").read_text()
    scenery = (game / "js/scenery.js").read_text()
    entry = (game / "js/main.js").read_text()
    landscape = instrument(landscape, 'W=innerWidth; H=innerHeight; dpr=Math.min(devicePixelRatio||1,1.5);',
                        '({W,H,dpr}=benchmark.size); canvas.style.width=W+"px"; canvas.style.height=H+"px";')
    landscape = instrument(landscape, '  ctx.globalAlpha=.59;\n  ctx.save();',
                        '  benchmark.start("mirror");\n  if(!benchmark.skipMirror){\n  ctx.globalAlpha=.59;\n  ctx.save();')
    landscape = instrument(landscape, '  ctx.globalAlpha=1;\n  const veil=',
                        '  }\n  benchmark.end("mirror");\n  ctx.globalAlpha=1;\n  const veil=')
    landscape = instrument(landscape, '  reflectedPigments(world);',
                        '  benchmark.start("pigments"); if(!benchmark.skipReflections)reflectedPigments(world); benchmark.end("pigments");')
    landscape = instrument(landscape, '  iceDetails(light,water,world);',
                        '  benchmark.start("ice"); iceDetails(light,water,world); benchmark.end("ice");')
    render = instrument(render, '  prepareWorld();\n  const world=visibleWorld();\n  drawSky(light);drawWater(light,water,world);\n  drawRouteScenery(light,water,world);',
                        '''  benchmark.start("world");
  prepareWorld();
  const world=visibleWorld();
  benchmark.end("world");
  benchmark.start("sky"); drawSky(light); benchmark.end("sky");
  benchmark.start("water");
  if(benchmark.skipWater){
    ctx.fillStyle=rgba(water,1);ctx.fillRect(0,horizon,W,H-horizon);
  }else drawWater(light,water,world);
  benchmark.end("water");
  benchmark.start("scenery"); drawRouteScenery(light,water,world); benchmark.end("scenery");''')
    render = instrument(render, '  ctx.save();ctx.globalAlpha=.20*(1-air)**2*(1-river*.85);',
                        '  benchmark.start("travelerReflection");\n  if(!benchmark.skipReflections){\n  ctx.save();ctx.globalAlpha=.20*(1-air)**2*(1-river*.85);')
    render = instrument(render, '    riverBoat(px,groundY,scale*.91,river,true,false,bearing);\n  }',
                        '  }\n  }\n  benchmark.end("travelerReflection");\n  if(river>0)riverBoat(px,groundY,scale*.91,river,true,false,-heading*.12);')
    scenery = instrument(scenery, '    riverBoat(boat.x,boat.y+3*size,size,fade*.27,true,true);',
                        '    if(!benchmark.skipReflections)riverBoat(boat.x,boat.y+3*size,size,fade*.27,true,true);')
    scenery = instrument(scenery, '    riverBoat(p.x,p.y+3*p.scale,p.scale*1.06,fade*.29,true,true);',
                        '    if(!benchmark.skipReflections)riverBoat(p.x,p.y+3*p.scale,p.scale*1.06,fade*.29,true,true);')
    render = instrument(render, '  requestAnimationFrame(render);\n}', '}')
    entry = instrument(entry, '\nrequestAnimationFrame(render);',
                        '''
benchmark.attach({
  canvas,
  ready:()=>art.decode().catch(()=>{}),
  scene(index){
    start=true;
    t=0; previousFrame=0; timeInDream=0;
    heading=position=lateral=0;
    distance=0; velocity=.86; stridePhase=0; kick=0; brake=0;
    enterChapter(index,true);
    previous=current; transition=1;
    nextLine=chapters[index].lines.length;
  },
  render,
});''')
    with tempfile.TemporaryDirectory(prefix="dreamer-render-") as directory:
        root = Path(directory)
        (root / "index.html").write_text(page)
        (root / "style.css").symlink_to(game / "style.css")
        (root / "benchmark.js").symlink_to(HERE / "benchmark.js")
        (root / "assets").symlink_to(game / "assets", target_is_directory=True)
        (root / "js").mkdir()
        instrumented = {"landscape.js": landscape, "scenery.js": scenery, "render.js": render, "main.js": entry}
        for path in (game / "js").glob("*.js"):
            target = root / "js" / path.name
            if path.name in instrumented:
                target.write_text(instrumented[path.name])
            else:
                target.symlink_to(path)
        server = ThreadingHTTPServer(("127.0.0.1", args.port),
                                      partial(SimpleHTTPRequestHandler, directory=directory))
        print(f"http://127.0.0.1:{args.port}/", flush=True)
        server.serve_forever()

if __name__ == "__main__":
    main()
