import { StartGameScreenData } from "@polusgg/plugin-polusgg-api/src/services/roleManager/roleManagerService";
import { EdgeAlignments } from "@polusgg/plugin-polusgg-api/src/types/enums/edgeAlignment";
import { BaseManager } from "@polusgg/plugin-polusgg-api/src/baseManager/baseManager";
import { BaseRole, RoleAlignment, RoleMetadata } from "@polusgg/plugin-polusgg-api/src/baseRole/baseRole";
import { Location, ServiceType } from "@polusgg/plugin-polusgg-api/src/types/enums";
import { AssetBundle } from "@polusgg/plugin-polusgg-api/src/assets";
import { PlayerInstance } from "@nodepolus/framework/src/api/player";
import { Services } from "@polusgg/plugin-polusgg-api/src/services";
import { Vector2 } from "@nodepolus/framework/src/types";
import { getAlignmentSpriteForRole, getSpriteForRole, resolveOptionPercent, TownOfPolusGameOptions } from "../..";
import { TownOfPolusGameOptionNames } from "../types";
import { Player } from "@nodepolus/framework/src/player";
import { SetOutlinePacket } from "@polusgg/plugin-polusgg-api/src/packets/rpc/playerControl/setOutline";
import { GameState } from "@nodepolus/framework/src/types/enums";
import { Button } from "@polusgg/plugin-polusgg-api/src/services/buttonManager";
import { Crewmate } from "@polusgg/plugin-polusgg-api/src/baseRole/crewmate/crewmate";
import { EmojiService } from "@polusgg/plugin-polusgg-api/src/services/emojiService/emojiService";

export class OracleManager extends BaseManager {
  getId(): string { return "oracle" }
  getTypeName(): string { return "Oracle" }
}

const COLOR = "#2c4cc9";

const ORACLE_DEAD_STRING = `<color=${COLOR}>Role: Oracle</color>
<color=#ff1919>You're dead, finish your tasks.</color>`;

export class Oracle extends Crewmate {
  public enchanted: PlayerInstance | undefined;
  protected metadata: RoleMetadata = {
    name: "Oracle",
    alignment: RoleAlignment.Crewmate,
    preventBaseEmoji: true,
  };

  constructor(owner: PlayerInstance) {
    super(owner);

    if (owner.getConnection() !== undefined) {
      Services.get(ServiceType.Name).setFor(this.owner.getSafeConnection(), this.owner, `${getSpriteForRole(this)} ${Services.get(ServiceType.Name).getFor(this.owner.getSafeConnection(), this.owner)}`);

      Services.get(ServiceType.Resource).load(owner.getConnection()!, AssetBundle.loadSafeFromCache("TownOfPolus/TownOfPolus")).then(this.onReady.bind(this));
    } else {
      this.onReady();
    }

    this.catch("player.died", e => e.getPlayer()).execute(event => {
      Services.get(ServiceType.Hud).setHudString(event.getPlayer(), Location.TaskText, ORACLE_DEAD_STRING);
    });
  }

  * coSaturateButton(player: PlayerInstance, button: Button): Generator<void, void, number> {
    if (player.getLobby().getGameState() !== GameState.Started) {
      yield;
    }

    const animService = Services.get(ServiceType.Animation);
    let outlined = false;
    let lastTarget: PlayerInstance | undefined;

    while (true) {
      if (this.enchanted !== undefined) {
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

  onReady(): void {
    const gameOptions = Services.get(ServiceType.GameOptions).getGameOptions<TownOfPolusGameOptions>(this.owner.getLobby());

    Services.get(ServiceType.Button).spawnButton(this.owner.getSafeConnection(), {
      asset: AssetBundle.loadSafeFromCache("TownOfPolus/TownOfPolus").getSafeAsset("Assets/Mods/TownOfPolus/Predict.png"),
      maxTimer: gameOptions.getOption(TownOfPolusGameOptionNames.OracleCooldown).getValue().value,
      position: new Vector2(-2.1, -0.7),
      alignment: EdgeAlignments.RightBottom,
      currentTime: 10,
    }).then(button => {
      this.catch("player.died", event => event.getPlayer())
        .execute(() => {
          button.destroy();
        });
      this.catch("meeting.ended", event => event.getGame())
        .execute(() => {
          button.setCurrentTime(button.getMaxTime());
        });
      Services.get(ServiceType.CoroutineManager)
        .beginCoroutine(this.owner, this.coSaturateButton(this.owner, button));

      button.on("clicked", () => {
        const target = button.getTarget(this.owner.getLobby().getOptions().getKillDistance() + 1);

        if (!button.isSaturated() || target === undefined || this.enchanted !== undefined || button.isDestroyed()) {
          return;
        }

        button.setCountingDown(false);
        this.enchanted = target;
        this.owner.getLobby().sendRpcPacket((this.enchanted as Player).getEntity().getPlayerControl(), new SetOutlinePacket(true, [44, 76, 201, 255]), [this.owner.getSafeConnection()]);
        button.destroy();
      });
    });

    this.catch("meeting.started", event => event.getVictim()).execute(_event => {
      if (this.enchanted === undefined) {
        return;
      }

      Services.get(ServiceType.Animation).clearOutline(this.enchanted);

      // We don't do checks for disconnected oracles as oracles who disconnect after predicting on someone ruin the game for public lobbies
      if (this.owner.isDead() && !this.enchanted.isDead()) {
        const realAlignment = getAlignmentSpriteForRole(this.enchanted.getMeta<BaseRole>("pgg.api.role"));
        const displayCorrectly = resolveOptionPercent(gameOptions.getOption(TownOfPolusGameOptionNames.OracleAccuracy).getValue().value);

        console.log("SettingName", realAlignment, displayCorrectly);

        if (displayCorrectly === 1) {
          Services.get(ServiceType.Name).set(this.enchanted, `${realAlignment} ${this.enchanted.getName().toString()}`);
        } else {
          let possibilities = [
            EmojiService.static("crewalign"),
            EmojiService.static("neutalign"),
            EmojiService.static("impoalign"),
          ];

          possibilities = possibilities.filter(p => p !== realAlignment);

          Services.get(ServiceType.Name).set(this.enchanted, `${Math.random() > 0.5 ? possibilities[1] : possibilities[0]} ${this.enchanted.getName().toString()}`);
        }
      }
    });
  }

  getManagerType(): typeof BaseManager {
    return OracleManager;
  }

  getAssignmentScreen(_player: PlayerInstance): StartGameScreenData {
    return {
      title: "Oracle",
      subtitle: "Predict a player alignment",
      color: [44, 76, 201, 255],
    };
  }

  getDescriptionText(): string {
    return `<color=${COLOR}>Role: Oracle
Finish your tasks.
You can predict a player alignment. It will be\nrevealed if your body is found.</color>`;
  }
}
