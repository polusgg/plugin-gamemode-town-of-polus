import { StartGameScreenData } from "@polusgg/plugin-polusgg-api/src/services/roleManager/roleManagerService";
import { BaseManager } from "@polusgg/plugin-polusgg-api/src/baseManager/baseManager";
import { BaseRole, RoleAlignment, RoleMetadata } from "@polusgg/plugin-polusgg-api/src/baseRole/baseRole";
import { PlayerInstance } from "@nodepolus/framework/src/api/player";
import { Button } from "@polusgg/plugin-polusgg-api/src/services/buttonManager";
import { Services } from "@polusgg/plugin-polusgg-api/src/services";
import { Location, ServiceType } from "@polusgg/plugin-polusgg-api/src/types/enums";
import { Asset, AssetBundle } from "@polusgg/plugin-polusgg-api/src/assets";
import { EdgeAlignments } from "@polusgg/plugin-polusgg-api/src/types/enums/edgeAlignment";
import { Mutable, Vector2 } from "@nodepolus/framework/src/types";
import { getAlignmentSpriteForRole, getSpriteForRole, resolveOptionPercent, TownOfPolusGameOptions } from "../../index";
import { TownOfPolusGameOptionNames } from "../types";
import { GameState, Level, SystemType } from "@nodepolus/framework/src/types/enums";
import { Crewmate } from "@polusgg/plugin-polusgg-api/src/baseRole/crewmate/crewmate";
import { LobbyDefaultOptions } from "@polusgg/plugin-polusgg-api/src/services/gameOptions/gameOptionsService";
import { Engineer } from "./engineer";
import { DOOR_POSITIONS_BY_ID, Locksmith, LOCKSMITH_RANGE_BY_OPTION } from "./locksmith";
import { AutoDoorsSystem, DoorsSystem } from "@nodepolus/framework/src/protocol/entities/shipStatus/systems";
import { AutoDoorsHandler } from "@nodepolus/framework/src/host/systemHandlers";
import { NumberValue } from "@polusgg/plugin-polusgg-api/src/packets/root/setGameOption";
import { Palette } from "@nodepolus/framework/src/static";
import { Player } from "@nodepolus/framework/src/player";
import { SetOutlinePacket } from "@polusgg/plugin-polusgg-api/src/packets/rpc/playerControl/setOutline";
import { Phantom } from "./phantom";
import { PhantomState } from "../types/enums/phantomState";
import { EmojiService } from "@polusgg/plugin-polusgg-api/src/services/emojiService/emojiService";
import { Oracle } from "./oracle";
import { Sheriff } from "./sheriff";
import { WinSoundType } from "@polusgg/plugin-polusgg-api/src/types/enums/winSound";
import { SerialKiller } from "./serialKiller";
import { KeyCode } from "@polusgg/plugin-polusgg-api/src/types/enums/keyCode";
import { Snitch } from "./snitch";

const COLOR = "#96b7cc";

export class StudentManager extends BaseManager {
  getId(): string { return "student" }
  getTypeName(): string { return "student" }
}

export class Student extends Crewmate {
  protected metadata: RoleMetadata = {
    name: "Student",
    alignment: RoleAlignment.Crewmate,
    preventBaseEmoji: true,
  };

  private lockpickOpen!: Asset;
  private lockpickClose!: Asset;
  private lockpickNone!: Asset;

  private readonly locksmithRange: number;
  private readonly locksmithMaxUses: number;
  private locksmithLeftUses: number;
  private readonly locksmithCooldown: NumberValue;
  private doors: [Vector2, number][] = [];

  oracleEnchanted?: PlayerInstance;
  snitchFinishedTasks: boolean;
  role?: typeof BaseRole;
  abilityButton?: Button;
  wasMentor: boolean;

  constructor(owner: PlayerInstance) {
    super(owner);

    const gameOptions = Services.get(ServiceType.GameOptions).getGameOptions<TownOfPolusGameOptions & LobbyDefaultOptions>(this.owner.getLobby());

    this.locksmithCooldown = gameOptions.getOption(TownOfPolusGameOptionNames.LocksmithCooldown)?.getValue();
    this.locksmithMaxUses = 1;
    this.locksmithLeftUses = this.locksmithMaxUses; // gameOptions.getOption(TownOfPolusGameOptionNames.LocksmithUses).getValue();

    this.locksmithRange = LOCKSMITH_RANGE_BY_OPTION.get(gameOptions.getOption(TownOfPolusGameOptionNames.LocksmithRange)
      ?.getValue()
      .getSelected())!;

    this.lockpickOpen = AssetBundle.loadSafeFromCache("TownOfPolus/TownOfPolus").getSafeAsset("Assets/Mods/TownOfPolus/Open.png");
    this.lockpickClose = AssetBundle.loadSafeFromCache("TownOfPolus/TownOfPolus").getSafeAsset("Assets/Mods/TownOfPolus/Close.png");
    this.lockpickNone = AssetBundle.loadSafeFromCache("TownOfPolus/TownOfPolus").getSafeAsset("Assets/Mods/TownOfPolus/None.png");

    this.doors = DOOR_POSITIONS_BY_ID[this.owner.getLobby().getLevel()];

    this.snitchFinishedTasks = false;
    this.wasMentor = false;

    this.onReady();

    this.catch("player.died", event => event.getPlayer()).execute(_ => {
      this.abilityButton?.destroy();
      this.role = undefined;
      Services.get(ServiceType.Hud).setHudString(this.owner, Location.TaskText, this.getDescriptionText());
    });
  }

  async onReady(): Promise<void> {

  }

  sabotageIsOccurring(): boolean {
    return this.owner.getLobby().getHostInstance().getSystemsHandler()
      ?.isSabotaged(true) ?? false;
  }

  async giveEngineer() {
    this.role = Engineer;
    Services.get(ServiceType.Hud).setHudString(this.owner, Location.TaskText, this.getDescriptionText());

    this.abilityButton = await Services.get(ServiceType.Button).spawnButton(this.owner.getSafeConnection(), {
      asset: AssetBundle.loadSafeFromCache("TownOfPolus/TownOfPolus").getSafeAsset("Assets/Mods/TownOfPolus/Fix.png"),
      maxTimer: 0.1,
      position: new Vector2(-2.1, -0.7),
      alignment: EdgeAlignments.RightBottom,
      currentTime: 0,
      saturated: false,
    });

    this.catch("player.died", event => event.getPlayer()).execute(_ => {
      if (this.role !== Engineer)
        return;
    });

    Services.get(ServiceType.CoroutineManager)
      .beginCoroutine(this.owner, this.coSaturateEngineerButton(this.owner, this.abilityButton));

    this.abilityButton.on("clicked", () => {
      if (this.role !== Engineer)
        return;

      const host = this.owner.getLobby().getHostInstance();

      if (this.abilityButton === undefined || !this.abilityButton.isSaturated() || !this.sabotageIsOccurring() || this.abilityButton.isDestroyed()) {
        return;
      }

      host.getSystemsHandler()!.repairAll(true);
      this.abilityButton.getEntity().despawn();
      this.abilityButton = undefined;

      this.role = undefined;

      Services.get(ServiceType.Hud).setHudString(this.owner, Location.TaskText, this.getDescriptionText());
    });
  }

  *coSaturateEngineerButton(player: PlayerInstance, button: Button): Generator<void, void, number> {
    if (player.getLobby().getGameState() !== GameState.Started) {
      yield;
    }

    while (true) {
      if (player.isDead()) {
        return;
      }

      const isSaturated = button.isSaturated();

      if (this.sabotageIsOccurring() !== isSaturated) {
        button.setSaturated(!isSaturated);
      }
      yield;
    }
  }

  getClosestDoor(): number | undefined {
    const inRange = this.doors.filter(([pos]) => this.owner.getPosition().distance(pos) < this.locksmithRange);
    const closest = inRange.sort((d1, d2) => d1[0].distance(this.owner.getPosition()) - d2[0].distance(this.owner.getPosition()))[0];

    if ((closest as [Vector2, number] | undefined) === undefined || this.locksmithLeftUses === 0) {
      return undefined;
    }

    return closest[1];
  }

  updateLockdownButton(position: Vector2 = this.owner.getPosition()): void {
    if (this.role !== Locksmith)
      return;

    if (!this.abilityButton)
      return;

    if (this.locksmithLeftUses === 0 || this.owner.isDead()) {
      return;
    }

    const canHighlight = this.doors.filter(([pos]) => position.distance(pos) < this.locksmithRange).length > 0;
    const closestDoor = this.getClosestDoor();
    let nextAsset: Asset = this.lockpickNone;

    if (closestDoor != undefined) {
      const currentState = (this.owner.getLobby().getShipStatus()?.getShipStatus()
        .getSystemFromType(SystemType.Doors) as DoorsSystem | AutoDoorsSystem).getDoorState(closestDoor);

      this.abilityButton.setSaturated(canHighlight);
      nextAsset = currentState == true ? this.lockpickClose : this.lockpickOpen;
    }

    if (this.abilityButton.getEntity().getGraphic().getAsset() !== nextAsset.getId()) {
      this.abilityButton.setAsset(nextAsset);
    }
  }

  async giveLocksmith() {
    this.role = Locksmith;
    Services.get(ServiceType.Hud).setHudString(this.owner, Location.TaskText, this.getDescriptionText());

    this.abilityButton = await Services.get(ServiceType.Button).spawnButton(this.owner.getSafeConnection(), {
      alignment: EdgeAlignments.RightBottom,
      position: new Vector2(-2.1, -0.7),
      currentTime: 0,
      maxTimer: this.locksmithCooldown.value,
      isCountingDown: false,
      saturated: false,
      asset: this.lockpickNone,
    });

    this.catch("meeting.ended", event => event.getGame())
      .execute(() => {
        if (this.role !== Locksmith)
          return;

        this.abilityButton!.setCurrentTime(0);
      });

    this.catch("player.position.updated", p => p.getPlayer()).execute(move => {
      if (this.role !== Locksmith)
        return;

      this.updateLockdownButton(move.getNewPosition());
    });

    this.catch("room.doors.closed", e => e.getGame()).execute(() => {
      if (this.role !== Locksmith)
        return;

      setTimeout(() => {
        this.updateLockdownButton()
      }, 100);
    });

    this.catch("room.doors.opened", e => e.getGame()).execute(() => {
      if (this.role !== Locksmith)
        return;

      setTimeout(() => {
        this.updateLockdownButton()
      }, 100);
    });

    this.abilityButton.on("clicked", _ => {
      if (this.role !== Locksmith)
        return;

      if (this.owner.isDead()) {
        return;
      }

      const inRange = this.doors.filter(([pos]) => this.owner.getPosition().distance(pos) < this.locksmithRange);
      const closest = inRange.sort((d1, d2) => d1[0].distance(this.owner.getPosition()) - d2[0].distance(this.owner.getPosition()))[0];

      const closestDoorId = closest || this.locksmithLeftUses === 0 ? closest[1] : undefined;

      if (closestDoorId === undefined || this.abilityButton!.getCurrentTime() !== 0) {
        return;
      }

      this.locksmithLeftUses--;
      if (this.locksmithLeftUses <= 0) {
        this.abilityButton!.destroy();
        this.role = undefined;
        Services.get(ServiceType.Hud).setHudString(this.owner, Location.TaskText, this.getDescriptionText());
      } else {
        Services.get(ServiceType.Hud).setHudString(this.owner, Location.TaskText, this.getDescriptionText());
      }
      this.abilityButton!.reset();

      const doorSystem = (this.owner.getLobby().getShipStatus()?.getShipStatus()
        .getSystemFromType(SystemType.Doors) as DoorsSystem | AutoDoorsSystem);

      if (this.owner.getLobby().getLevel() === Level.TheSkeld || this.owner.getLobby().getLevel() === Level.AprilSkeld) {
        const doorHandler = this.owner.getLobby().getHostInstance().getDoorHandler() as AutoDoorsHandler;

        doorHandler.closeDoor(closestDoorId, !doorSystem.getDoorState(closestDoorId));
        // doorHandler.setSystemTimeout(systemId, 30);
      } else {
        this.owner.getLobby().getHostInstance().getDoorHandler()
          ?.setOldShipStatus();

        doorSystem.setDoorState(closestDoorId, !doorSystem.getDoorState(closestDoorId));

        this.owner.getLobby().getHostInstance().getDoorHandler()
          ?.sendDataUpdate();
      }

      if (this.locksmithLeftUses === 0 || this.owner.isDead()) {
        return;
      }

      this.updateLockdownButton();
    });
  }

  async giveOracle() {
    this.role = Oracle;
    Services.get(ServiceType.Hud).setHudString(this.owner, Location.TaskText, this.getDescriptionText());

    const gameOptions = Services.get(ServiceType.GameOptions).getGameOptions<TownOfPolusGameOptions>(this.owner.getLobby());

    this.abilityButton = await Services.get(ServiceType.Button).spawnButton(this.owner.getSafeConnection(), {
      asset: AssetBundle.loadSafeFromCache("TownOfPolus/TownOfPolus").getSafeAsset("Assets/Mods/TownOfPolus/Predict.png"),
      maxTimer: 10,//gameOptions.getOption(TownOfPolusGameOptionNames.OracleCooldown).getValue().value,
      position: new Vector2(-2.1, -0.7),
      alignment: EdgeAlignments.RightBottom,
      currentTime: 10,
    });

    this.catch("player.died", event => event.getPlayer())
      .execute(() => {
        if (this.role !== Oracle)
          return;

        this.abilityButton?.destroy();
      });
    this.catch("meeting.ended", event => event.getGame())
      .execute(() => {
        if (this.role !== Oracle)
          return;

        this.abilityButton?.setCurrentTime(this.abilityButton.getMaxTime());
      });

    Services.get(ServiceType.CoroutineManager)
      .beginCoroutine(this.owner, this.coSaturateOracleButton(this.owner, this.abilityButton));

    this.abilityButton.on("clicked", () => {
      if (this.role !== Oracle)
        return;

      const target = this.abilityButton?.getTarget(this.owner.getLobby().getOptions().getKillDistance() + 1);

      if (!this.abilityButton || !this.abilityButton.isSaturated() || target === undefined || this.oracleEnchanted !== undefined || this.abilityButton.isDestroyed()) {
        return;
      }

      this.abilityButton.setCountingDown(false);
      this.oracleEnchanted = target;
      this.owner.getLobby().sendRpcPacket((this.oracleEnchanted as Player).getEntity().getPlayerControl(), new SetOutlinePacket(true, [44, 76, 201, 255]), [this.owner.getSafeConnection()]);
      this.abilityButton.destroy();
      this.role = undefined;
      Services.get(ServiceType.Hud).setHudString(this.owner, Location.TaskText, this.getDescriptionText());
    });

    this.catch("meeting.started", event => event.getVictim()).execute(_event => {
      if (this.oracleEnchanted === undefined) {
        return;
      }

      Services.get(ServiceType.Animation).clearOutline(this.oracleEnchanted);

      // We don't do checks for disconnected oracles as oracles who disconnect after predicting on someone ruin the game for public lobbies
      if (this.owner.isDead() && !this.oracleEnchanted.isDead()) {
        const enchantedRole = this.oracleEnchanted.getMeta<BaseRole>("pgg.api.role");
        const realAlignment = getAlignmentSpriteForRole(enchantedRole);
        const displayCorrectly = resolveOptionPercent(gameOptions.getOption(TownOfPolusGameOptionNames.OracleAccuracy).getValue().value);

        if (displayCorrectly === 1) {
          Services.get(ServiceType.Name).set(this.oracleEnchanted, `${realAlignment} ${this.oracleEnchanted.getName().toString()}`);

          if (enchantedRole.getName() === "Phantom") {
            if ((enchantedRole as Phantom).state === PhantomState.Alive) {
              Services.get(ServiceType.Name).setFor([ this.oracleEnchanted.getConnection()! ], this.oracleEnchanted, `${realAlignment} ${this.oracleEnchanted.getName().toString()}`);
              return;
            }
          }

          Services.get(ServiceType.Name).setFor([ this.oracleEnchanted.getConnection()! ], this.oracleEnchanted, `${realAlignment} ${getSpriteForRole(enchantedRole)} ${this.oracleEnchanted.getName().toString()}`);
        } else {
          let possibilities = [
            EmojiService.static("crewalign"),
            EmojiService.static("neutalign"),
            EmojiService.static("impoalign"),
          ];

          possibilities = possibilities.filter(p => p !== realAlignment);

          Services.get(ServiceType.Name).set(this.oracleEnchanted, `${Math.random() > 0.5 ? possibilities[1] : possibilities[0]} ${this.oracleEnchanted.getName().toString()}`);
        }
      }
    });
  }

  *coSaturateOracleButton(player: PlayerInstance, button: Button): Generator<void, void, number> {
    if (this.role !== Oracle)
      return;

    if (player.getLobby().getGameState() !== GameState.Started) {
      yield;
    }

    const animService = Services.get(ServiceType.Animation);
    let outlined = false;
    let lastTarget: PlayerInstance | undefined;

    while (true) {
      if (this.oracleEnchanted !== undefined) {
        yield;
        continue;
      }

      const target = button.getTargets(this.owner.getLobby().getOptions().getKillDistance() + 1).filter(poo => !poo.isDead())[0] as PlayerInstance | undefined;

      const isSaturated = button.isSaturated();

      if ((target === undefined) === isSaturated) {
        button.setSaturated(!isSaturated);
      }

      if ((target === undefined) === outlined || lastTarget !== target) {
        const players = this.owner.getLobby().getPlayers().filter(x => x !== this.owner);

        for (let i = 0; i < players.length; i++) {
          if (players[i] === target && !players[i].isDead()) {
            animService.setOutline(players[i], [44, 76, 201, 255], [this.owner.getSafeConnection()]);
          } else {
            animService.clearOutlineFor(players[i], this.owner.getSafeConnection());
          }
        }

        lastTarget = target;
        outlined = !outlined;
      }
      yield;
    }
  }

  async giveSheriff() {
    this.role = Sheriff;
    Services.get(ServiceType.Hud).setHudString(this.owner, Location.TaskText, this.getDescriptionText());

    const endGame = Services.get(ServiceType.EndGame);

    Services.get(ServiceType.Name).setFor(this.owner.getSafeConnection(), this.owner, `${getSpriteForRole(this)} ${Services.get(ServiceType.Name).getFor(this.owner.getSafeConnection(), this.owner)}`);

    this.catch("player.murdered", event => event.getPlayer().getLobby())
      .where(event => event.getPlayer().getLobby().getPlayers()
        // player.getMeta<BaseRole | undefined>("pgg.api.role")?.getAlignment() === RoleAlignment.Impostor
        .filter(player => (player.isImpostor() || player.getMeta<BaseRole | undefined>("pgg.api.role") instanceof SerialKiller) && !player.isDead() && !player.getGameDataEntry().isDisconnected())
        .length == 0)
      .execute(async event => {
        if (this.role !== Sheriff)
          return;

        this.abilityButton!.destroy();
        this.role = undefined;
        Services.get(ServiceType.Hud).setHudString(this.owner, Location.TaskText, this.getDescriptionText());

        const impostorCount = this.owner.getLobby().getPlayers().filter(player => player.isImpostor()).length;

        if (event.getPlayer().getLobby().getGame() !== undefined) {
          await endGame.registerEndGameIntent(event.getPlayer().getLobby().getSafeGame()!, {
            endGameData: new Map(event.getPlayer().getLobby().getPlayers()
              .map(player => [player, {
                title: player.getMeta<BaseRole | undefined>("pgg.api.role")?.getAlignment() === RoleAlignment.Crewmate ? "Victory" : "<color=#FF1919FF>Defeat</color>",
                // subtitle: "<color=#FF1919FF>Sheriff</color> killed all <color=#C49645FF>Impostors</color>",
                subtitle: player === this.owner ? `You killed ${impostorCount != 1 ? "all" : "the"} <color=#FF1919FF>Impostor${impostorCount != 1 ? "s" : ""}` : `<color=${COLOR}>Student (Sheriff)</color> killed ${impostorCount != 1 ? "all" : "the"} <color=#FF1919FF>Impostor${impostorCount != 1 ? "s" : ""}</color>`,
                color: Palette.crewmateBlue() as Mutable<[number, number, number, number]>,
                yourTeam: event.getPlayer().getLobby().getPlayers()
                  .filter(sus => sus.getMeta<BaseRole | undefined>("pgg.api.role")?.getAlignment() === RoleAlignment.Crewmate),
                winSound: WinSoundType.CrewmateWin,
                hasWon: player.getMeta<BaseRole | undefined>("pgg.api.role")?.getAlignment() === RoleAlignment.Crewmate,
              }])),
            intentName: "sheriffKill",
          });
        }
      });

    this.catch("player.died", e => e.getPlayer()).execute(event => {
      if (this.role !== Sheriff)
        return;

      Services.get(ServiceType.Hud).setHudString(event.getPlayer(), Location.TaskText, this.getDescriptionText());
    });

    const gameOptions = Services.get(ServiceType.GameOptions).getGameOptions<TownOfPolusGameOptions>(this.owner.getLobby());
    this.abilityButton = await Services.get(ServiceType.Button)
      .spawnButton(this.owner.getSafeConnection(), {
        asset: AssetBundle.loadSafeFromCache("TownOfPolus/TownOfPolus").getSafeAsset("Assets/Mods/TownOfPolus/Shoot.png"),
        maxTimer: gameOptions.getOption(TownOfPolusGameOptionNames.SheriffCooldown).getValue().value,
        position: new Vector2(-2.1, -0.7),
        alignment: EdgeAlignments.RightBottom,
        currentTime: 15,
        keys: [
          KeyCode.Q,
        ],
      });

    const range = this.owner.getLobby()
      .getOptions()
      .getKillDistance() + 1;

    Services.get(ServiceType.CoroutineManager)
      .beginCoroutine(this.owner, this.coSaturateSheriffButton(this.owner, this.abilityButton));

    this.abilityButton.on("clicked", async () => {
      if (this.role !== Sheriff)
        return;

      if (this.abilityButton === undefined || !this.abilityButton.isSaturated() || this.abilityButton.getCurrentTime() != 0) {
        return;
      }

      const target = this.abilityButton.getTargets(range).filter(player => !player.isDead())[0] as PlayerInstance | undefined;

      if (target === undefined) {
        return;
      }

      this.abilityButton.reset();
      this.owner.murder(target);

      if (target.getMeta<BaseRole | undefined>("pgg.api.role")?.getAlignment() === RoleAlignment.Crewmate) {
        await this.owner.murder(this.owner);

        if ((this.owner.getLobby().getHostInstance() as unknown as { shouldEndGame(): boolean }).shouldEndGame()) {
          const impostorCount = this.owner.getLobby().getPlayers().filter(player => player.isImpostor()).length;

          console.trace("Registering sheriff misfire event");

          await Services.get(ServiceType.EndGame).registerEndGameIntent(this.owner.getLobby().getGame()!, {
            intentName: "sheriffMisfire",
            endGameData: new Map(this.owner.getLobby().getPlayers()
              .map((player, _, players) => [player, {
                title: player.isImpostor() ? "Victory" : "<color=#FF1919FF>Defeat</color>",
                subtitle: player === this.owner ? `You misfired!` : `<color=#FF1919FF>Impostor${impostorCount != 1 ? "s" : ""}</color> won by <color=${COLOR}>Sheriff</color> misfire`,
                color: Palette.impostorRed() as Mutable<[number, number, number, number]>,
                yourTeam: players.filter(sus => sus.isImpostor()),
                winSound: WinSoundType.ImpostorWin,
                hasWon: player.isImpostor(),
              }])),
          });
        }
      }
    });
  }

  *coSaturateSheriffButton(player: PlayerInstance, button: Button) {
    if (this.role !== Sheriff)
      return;

    if (player.getLobby()
      .getGameState() !== GameState.Started) {
      yield;
    }

    const range = this.owner.getLobby()
      .getOptions()
      .getKillDistance() + 1;

    const animService = Services.get(ServiceType.Animation);
    let outlined = false;
    let lastTarget: PlayerInstance | undefined;
    let wasInVent = false;

    while (true) {
      //todo break out on custom predicate
      if (player.isDead() || button.isDestroyed()) {
        const players = this.owner.getLobby()
          .getPlayers()
          .filter(x => x !== this.owner);

        for (let i = 0; i < players.length; i++) {
          animService.clearOutlineFor(players[i], this.owner.getSafeConnection());
        }
        break;
      }

      const target = button.getTargets(range)
          .filter(x => !x.isDead())[0] as PlayerInstance | undefined;

      const isSaturated = button.isSaturated();

      if ((this.owner.getVent() === undefined) === wasInVent) {
        if (!wasInVent) {
          button.setSaturated(false);
        }

        if (!wasInVent) {
          const players = this.owner.getLobby()
            .getPlayers()
            .filter(x => x !== this.owner);

          for (let i = 0; i < players.length; i++) {
            animService.clearOutlineFor(players[i], this.owner.getSafeConnection());
          }
        }

        wasInVent = (this.owner.getVent() !== undefined);

        while (this.owner.getVent() !== undefined) {
          if (player.isDead()) {
            break;
          }

          yield;
        }
        continue;
      }

      if ((target === undefined) === isSaturated) {
        button.setSaturated(!isSaturated);
      }

      if ((target === undefined) === outlined || lastTarget !== target) {
        const players = this.owner.getLobby()
          .getPlayers()
          .filter(x => x !== this.owner);

        for (let i = 0; i < players.length; i++) {
          if (players[i] === target) {
            animService.setOutline(players[i], [...Palette.impostorRed().slice(0, 3), 0xff], [this.owner.getSafeConnection()]);
          } else {
            animService.clearOutlineFor(players[i], this.owner.getSafeConnection());
          }
        }

        lastTarget = target;
        outlined = !outlined;
      }
      yield;
    }
  }

  giveSnitch() {
    this.role = Snitch;
    Services.get(ServiceType.Hud).setHudString(this.owner, Location.TaskText, this.getDescriptionText());

    const gameOptions = Services.get(ServiceType.GameOptions).getGameOptions<TownOfPolusGameOptions>(this.owner.getLobby());
    const poiManager = Services.get(ServiceType.PointOfInterestManager);

    this.catch("player.task.completed", event => event.getPlayer()).where(p => !p.getPlayer().isDead()).execute(async event => {
      const taskLeftCount = event.getPlayer().getTasks().filter(task => !task[1]).length;

      const remainingTasks = gameOptions.getOption(TownOfPolusGameOptionNames.SnitchRemainingTasks).getValue().value;

      if (taskLeftCount <= remainingTasks && taskLeftCount !== 0) {
        event.getPlayer().getLobby().getPlayers()
          .filter(player => player.isImpostor())
          .forEach(player => {
            Services.get(ServiceType.Hud).setHudString(player, Location.RoomTracker, `The <color=${COLOR}>Snitch</color> only has <size=120%><b>${taskLeftCount}</b></size> task${taskLeftCount == 1 ? "" : "s"} left, and is about to reveal <color=#ff1919>your role!</color>`);
          });
      }

      if (taskLeftCount == remainingTasks && !this.owner.isDead()) {
        const impostor = event.getPlayer().getLobby().getPlayers()
          .find(player => {
            if (!player.isDead() && player.getMeta<BaseRole | undefined>("pgg.api.role")?.getAlignment() == RoleAlignment.Impostor) {
              return true;
            }
          });

        if (!impostor)
          return;

        const poi = await poiManager.spawnPointOfInterest(impostor.getSafeConnection(), AssetBundle.loadSafeFromCache("TownOfPolus/TownOfPolus").getSafeAsset("Assets/Mods/TownOfPolus/SnitchArrow.png"), this.owner.getPosition(), this.owner);

        this.catch("player.died", event2 => event2.getPlayer().getLobby()).execute(event3 => {
          if (event3.getPlayer() === this.owner || event3.getPlayer().isImpostor()) {
            Services.get(ServiceType.Hud).setHudString(impostor, Location.RoomTracker, `__unset`);
            poi.despawn();
          }
        });

        this.catch("player.left", event2 => event2.getPlayer()).execute(_ => {
          Services.get(ServiceType.Hud).setHudString(impostor, Location.RoomTracker, `__unset`);
          poi.despawn();
        });;
      } else if (taskLeftCount == 0 && !this.owner.isDead()) {
        this.snitchFinishedTasks = true;
        Services.get(ServiceType.Hud).setHudString(event.getPlayer(), Location.TaskText, this.getDescriptionText());

        const impostor = event.getPlayer().getLobby().getPlayers()
          .find(player => {
            if (!player.isDead() && player.getMeta<BaseRole | undefined>("pgg.api.role")?.getAlignment() == RoleAlignment.Impostor) {
              return true;
            }
          });

        if (!impostor)
          return;

        const poi = await poiManager.spawnPointOfInterest(this.owner.getSafeConnection(), AssetBundle.loadSafeFromCache("TownOfPolus/TownOfPolus").getSafeAsset("Assets/Mods/TownOfPolus/ImpostorArrow.png"), impostor.getPosition(), impostor);
        const realAlignment = getAlignmentSpriteForRole(impostor.getMeta<BaseRole>("pgg.api.role"));

        Services.get(ServiceType.Name).setFor(this.owner.getSafeConnection(), impostor, `${realAlignment} ${impostor.getName().toString()}`);
        Services.get(ServiceType.Hud).setHudString(impostor, Location.RoomTracker, `The <color=${COLOR}>Snitch</color> has finished their tasks and revealed <color=#ff1919>your role!</color>`);

        setTimeout(() => {
          Services.get(ServiceType.Hud).setHudString(impostor, Location.RoomTracker, `__unset`);
        }, 10000);

        this.catch("player.died", event2 => event2.getPlayer().getLobby()).execute(event3 => {
          if (event3.getPlayer() === this.owner || event3.getPlayer().isImpostor()) {
            Services.get(ServiceType.Hud).setHudString(impostor, Location.RoomTracker, `__unset`);
            poi.despawn();
          }
        });

        this.catch("player.left", event2 => event2.getPlayer()).execute(_ => {
          Services.get(ServiceType.Hud).setHudString(impostor, Location.RoomTracker, `__unset`);
          poi.despawn();
        });
      }
    });
  }

  getManagerType(): typeof BaseManager {
    return StudentManager;
  }

  getAssignmentScreen(player: PlayerInstance, impostorCount: number): StartGameScreenData {
    return {
      title: "Crewmate",
      subtitle: `There ${(impostorCount != 1 ? "are" : "is")} ${impostorCount} <color=#FF1919FF>Impostor${(impostorCount != 1 ? "s" : "")}</color> among us`,
      color: Palette.crewmateBlue(),
    };
  }

  getDescriptionText(): string {
    const base = `<color=${COLOR}>Role: Student${this.wasMentor ? "\nYou have transcended all possibility and\ntrained yourself." : ""}</color>`;

    if (this.role === Engineer) {
      return `${base}
<color=#F8BF14>Learned Role: Engineer
Finish your tasks.
You can fix 1 sabotage.</color>`;
    }

    if (this.role === Locksmith) {
      return `${base}
<color=#3d85c6>Learned Role: Locksmith
Finish your tasks and open/close doors.
You have ${this.locksmithLeftUses} use${this.locksmithLeftUses != 1 ? "s" : ""} left.</color>`;
    }

    if (this.role === Oracle) {
      return `${base}
<color=#2c4cc9>Learned Role: Oracle
Finish your tasks.
You can predict a player's alignment. It
will be revealed if your body is found.</color>`;
    }

    if (this.role === Sheriff) {
      return `${base}
<color=#c49645>Learned Role: Sheriff
Finish your tasks and shoot an impostor.</color>`;
    }

    if (this.role === Snitch) {
      if (this.snitchFinishedTasks) {
        return `${base}
<color=#00ffdd>Learned Role: Snitch
You've finished your tasks, find\nan impostor.</color>`;
      } else {
        return `${base}
<color=#00ffdd>Learned Role: Snitch
Finish your tasks to reveal an impostor.</color>`;
      }
    }

    return `<color=#8cffff>Role: Crewmate
Finish your tasks.</color>`;
  }
}
