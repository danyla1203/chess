const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { EnvironmentPlugin } = require('webpack');

console.log(process.env);
module.exports = (env) => {
  console.log(env);
  return {
    entry: './src/index.tsx',
    target: 'web',
    mode: 'development',
    output: {
      path: path.resolve(__dirname, 'build'),
      filename: 'bundle.js',
    },
    resolve: {
      extensions: [ '.js', '.jsx', '.json', '.ts', '.tsx' ],
    },
    module: {
      rules: [
        {
          test: /\.(ts|tsx)$/,
          loader: 'ts-loader',
        },
        {
          enforce: 'pre',
          test: /\.js$/,
          loader: 'source-map-loader',
        },
        {
          test: /\.css$/,
          loader: 'css-loader',
        },
        {
          test: /\.(s(a|c)ss)$/,
          use: [ 'style-loader', 'css-loader', 'sass-loader' ]
        }
      ],
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: path.resolve(__dirname, 'src', 'index.html'),
      }),
      new EnvironmentPlugin({
        API_HOST: env.API_HOST
      })
    ],
  };
};
