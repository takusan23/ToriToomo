import { GameMainParameterObject, RPGAtsumaruWindow } from "./parameterObject";

declare const window: RPGAtsumaruWindow;

export function main(param: GameMainParameterObject): void {
	const scene = new g.Scene({
		game: g.game,
		// このシーンで利用するアセットのIDを列挙し、シーンに通知します
		assetIds: ["toomo", "result", "doutei_toomo", "itteq", "nensyuu_2man", "virus", "zyousoubu", "inu", "report", "wassyoi"]
	});
	let time = 60; // 制限時間
	if (param.sessionParameter.totalTimeLimit) {
		time = param.sessionParameter.totalTimeLimit; // セッションパラメータで制限時間が指定されたらその値を使用します
	}
	// 市場コンテンツのランキングモードでは、g.game.vars.gameState.score の値をスコアとして扱います
	g.game.vars.gameState = { score: 0 };

	// タイトルシーン
	const titleScene = new g.Scene({
		game: g.game,
		assetIds: ["title"]
	});
	titleScene.loaded.add(() => {
		// タイトル画面
		const titleSprite = new g.Sprite({
			scene: titleScene,
			src: titleScene.assets["title"]
		});
		titleScene.append(titleSprite);
		titleScene.setTimeout(() => {
			// 5秒待つ
			scene.loaded.add(() => {
				// ここからゲーム内容を記述します
				time -= 5;

				// 背景
				const backgruondFilledRect = new g.FilledRect({
					scene: scene,
					width: g.game.width,
					height: g.game.height,
					cssColor: "white"
				});
				scene.append(backgruondFilledRect);

				// フォントの生成
				const font = new g.DynamicFont({
					game: g.game,
					fontFamily: g.FontFamily.SansSerif,
					size: 48
				});

				// スコア表示用のラベル
				const scoreLabel = new g.Label({
					scene: scene,
					text: "スコア: 0",
					font: font,
					fontSize: font.size / 2,
					textColor: "black"
				});
				scene.append(scoreLabel);

				// スコア変更用関数
				const setScore = () => {
					scoreLabel.text = `スコア: ${g.game.vars.gameState.score} 点`;
					scoreLabel.invalidate();
				};

				// 残り時間表示用ラベル
				const timeLabel = new g.Label({
					scene: scene,
					text: "残り時間: 0",
					font: font,
					fontSize: font.size / 2,
					textColor: "black",
					x: 0.7 * g.game.width
				});
				scene.append(timeLabel);

				// プレイヤー
				const playerSprite = new g.Sprite({
					scene: scene,
					src: scene.assets["toomo"]
				});
				playerSprite.x = 100;
				playerSprite.y = 100;
				playerSprite.modified();
				scene.append(playerSprite);

				// ジャンプする関数
				const jump = () => {
					// 音
					(scene.assets["wassyoi"] as g.AudioAsset).play();
					const v0 = 10; // 初速
					const gravity = 0.9; // 重力加速度
					const ground = playerSprite.y; // プレイヤーのいちにするといい感じ
					let jumpTime = 0;
					const playerPosFunc = () => {
						// 公式
						const calc = (0.5 * gravity * jumpTime * jumpTime - v0 * jumpTime + ground);
						// 下で回避するやつ絶対いるので対策
						if (playerSprite.height + calc < g.game.height && calc > 0) {
							playerSprite.y = calc;
						} else if (calc < 0) {
							playerSprite.y = 0;
						}
						jumpTime++;
						playerSprite.modified();
					};
					playerSprite.update.remove(playerPosFunc);
					playerSprite.update.add(playerPosFunc);
				};

				// 画面を押したとき
				scene.pointDownCapture.add(() => {
					if (time >= 5) {
						jump(); // ジャンプする
					}
				});

				// 加点
				scene.update.add(() => {
					if (time >= 5) {
						g.game.vars.gameState.score++;
						setScore();
					}
				});

				// ランダムで物を置く
				const imgList = ["doutei_toomo", "itteq", "nensyuu_2man", "virus", "zyousoubu", "report", "inu"];
				// 物生成関数
				const createMono = () => {
					const random = g.game.random.get(0, imgList.length - 1);
					if (time >= 5) {
						const monoSprite = new g.Sprite({
							scene: scene,
							src: scene.assets[imgList[random]],
							tag: imgList[random] // タグに名前入れとく
						});
						monoSprite.x = (g.game.width) + monoSprite.width;
						monoSprite.y = g.game.random.get(0, 300);
						scene.append(monoSprite);
						monoSprite.update.add(() => {
							if (time >= 5) {
								monoSprite.x -= 10;
								if (g.Collision.intersectAreas(monoSprite, playerSprite)) {
									monoSprite.destroy();
									const assetId = monoSprite.tag as string;
									if (assetId === "inu") {
										// 犬の時は回復
										g.game.vars.gameState.score += 50;
									} else {
										g.game.vars.gameState.score -= 50;
									}
									setScore();
								}
							}
						});
					}
				};

				scene.setInterval(() => {
					createMono();
					if (time - 5 <= 40) {
						scene.setTimeout(() => {
							createMono();
						}, g.game.random.get(500, 1000)); // ずらすため
					}
				}, 1000);

				const updateHandler = () => {
					if (time <= 0) {
						// RPGアツマール環境であればランキングを表示します
						if (param.isAtsumaru) {
							const boardId = 1;
							window.RPGAtsumaru.experimental.scoreboards.setRecord(boardId, g.game.vars.gameState.score).then(function () {
								window.RPGAtsumaru.experimental.scoreboards.display(boardId);
							});
						}
						scene.update.remove(updateHandler); // カウントダウンを止めるためにこのイベントハンドラを削除します
					}
					if (time <= 5) {
						// 終了
						const resultSprite = new g.Sprite({
							scene: scene,
							src: scene.assets["result"]
						});
						scene.append(resultSprite);
					}
					// カウントダウン処理
					time -= 1 / g.game.fps;
					timeLabel.text = "残り時間: " + Math.ceil(time - 5) + " 秒";
					timeLabel.invalidate();
				};
				scene.update.add(updateHandler);
				// ここまでゲーム内容を記述します
			});
			g.game.pushScene(scene);
		}, 5000);

	});
	g.game.pushScene(titleScene);

}
