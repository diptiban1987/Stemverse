const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");

// Base config that applies to either development or production mode.
const config = {
  entry: "./src/index.js",
  output: {
    // Compile the source files into a bundle.
    filename: "bundle.js",
    path: path.resolve(__dirname, "dist"),
    clean: true,
  },
  // Enable webpack-dev-server to get hot refresh of the app.
  devServer: {
    allowedHosts: "all",
    setupMiddlewares: (middlewares, devServer) => {
      if (!devServer) throw new Error("webpack-dev-server is not defined");

      // Mount the Arduino compile/upload API
      const compileRouter = require("./server/compileServer");
      devServer.app.get("/api/ports", (req, res) => compileRouter(req, res));
      devServer.app.post("/api/compile", (req, res) => compileRouter(req, res));
      devServer.app.post("/api/upload", (req, res) => compileRouter(req, res));
      devServer.app.get("/api/libs", (req, res) => compileRouter(req, res));
      devServer.app.post("/api/install-lib", (req, res) => compileRouter(req, res));

      return middlewares;
    },
  },
  module: {
    rules: [
      {
        // Load CSS files. They can be imported into JS files.
        test: /\.css$/i,
        use: ["style-loader", "css-loader"],
      },
    ],
  },
  plugins: [
    // Landing page — served at root "/" (default index).
    new HtmlWebpackPlugin({
      template: "src/landing.html",
      filename: "index.html",
      chunks: [],
      inject: false,
    }),
    // Main app (Blockly simulator) — accessible at "/app.html".
    new HtmlWebpackPlugin({
      template: "src/index.html",
      filename: "app.html",
      chunks: ["main"],
    }),
  ],
};

module.exports = (env, argv) => {
  if (argv.mode === "development") {
    // Set the output path to the `build` directory
    // so we don't clobber production builds.
    config.output.path = path.resolve(__dirname, "build");

    // Generate source maps for our code for easier debugging.
    // Not suitable for production builds. If you want source maps in
    // production, choose a different one from https://webpack.js.org/configuration/devtool
    config.devtool = "eval-cheap-module-source-map";

    // Include the source maps for Blockly for easier debugging Blockly code.
    config.module.rules.push({
      test: /(blockly[/\\].*\.js)$/,
      use: [require.resolve("source-map-loader")],
      enforce: "pre",
    });

    // Ignore spurious warnings from source-map-loader
    // It can't find source maps for some Closure modules and that is expected
    config.ignoreWarnings = [/Failed to parse source map.*blockly/];
  }
  return config;
};
