import { StartGameScreenData } from "@polusgg/plugin-polusgg-api/src/services/roleManager/roleManagerService";
import { EdgeAlignments } from "@polusgg/plugin-polusgg-api/src/types/enums/edgeAlignment";
import { BaseManager } from "@polusgg/plugin-polusgg-api/src/baseManager/baseManager";
import { RoleAlignment, RoleMetadata } from "@polusgg/plugin-polusgg-api/src/baseRole/baseRole";
import { ServiceType } from "@polusgg/plugin-polusgg-api/src/types/enums";
import { AssetBundle } from "@polusgg/plugin-polusgg-api/src/assets";
import { PlayerInstance } from "@nodepolus/framework/src/api/player";
import { BaseRole } from "@polusgg/plugin-polusgg-api/src/baseRole";
import { Services } from "@polusgg/plugin-polusgg-api/src/services";
import { Vector2 } from "@nodepolus/framework/src/types";
import { TownOfPolusGameOptions } from "../..";

const alignmentColors: readonly string[] = [
  "FFFFFFFF",
  "FF0000FF",
  "C042FFFF",
] as const;

export class OracleManager extends BaseManager {
  getId(): string { return "oracle" }
  getTypeName(): string { return "Oracle" }
}

export class Oracle extends BaseRole {
  public enchanted: PlayerInstance | undefined;

  protected metadata: RoleMetadata = {
    name: "Oracle",
    alignment: RoleAlignment.Crewmate,
  };

  constructor(owner: PlayerInstance) {
    super(owner);

    if (owner.getConnection() !== undefined) {
      Services.get(ServiceType.Resource).load(owner.getConnection()!, AssetBundle.loadSafeFromCache("TownOfPolus")).then(this.onReady.bind(this));
    } else {
      this.onReady();
    }
  }

  onReady(): void {
    const gameOptions = Services.get(ServiceType.GameOptions).getGameOptions<TownOfPolusGameOptions>(this.owner.getLobby());

    Services.get(ServiceType.Button).spawnButton(this.owner.getSafeConnection(), {
      asset: AssetBundle.loadSafeFromCache("TownOfPolus").getSafeAsset("Assets/Mods/TownOfPolus/Predict.png"),
      maxTimer: gameOptions.getOption("oracleCooldown").getValue().value,
      position: new Vector2(2.1, 0.7),
      alignment: EdgeAlignments.RightBottom,
    }).then(button => {
      button.on("clicked", () => {
        if (button.getCurrentTime() != 0) {
          return;
        }

        button.reset();

        this.enchanted = button.getTarget(this.owner.getLobby().getOptions().getKillDistance());

        if (this.enchanted !== undefined) {
          Services.get(ServiceType.Animation).setOutline(this.enchanted, [255, 140, 238, 255]);
        }
      });
    });

    this.catch("meeting.started", event => event.getVictim()).execute(event => {
      if (this.enchanted === undefined) {
        return;
      }

      Services.get(ServiceType.Animation).clearOutline(this.enchanted);

      if (this.owner.isDead() || this.owner.getGameDataEntry().isDisconnected()) {
        const alignment = this.enchanted.getMeta<BaseRole>("pgg.api.role").getAlignment();

        Services.get(ServiceType.Name).setForBatch(event.getGame().getLobby().getConnections()
          .filter(connection => this.enchanted?.getConnection() !== connection), this.enchanted, `<color=#${(gameOptions.getOption("oracleAccuracy").getValue().value / 100 <= Math.random()) ? alignmentColors[alignment] : alignmentColors[(alignment + 1) % alignmentColors.length]}>${this.enchanted.getName().toString()}</color>`);
      }
    });

    this.catch("meeting.ended", event => event.getExiledPlayer()).execute(event => {
      if (this.enchanted === undefined) {
        return;
      }

      const alignment = this.enchanted.getMeta<BaseRole>("pgg.api.role").getAlignment();

      Services.get(ServiceType.Name).setForBatch(event.getGame().getLobby().getConnections()
        .filter(connection => this.enchanted?.getConnection() !== connection), this.enchanted, `[${alignmentColors[alignment]}]${this.enchanted.getName().toString()}[]`);
    });
  }

  getManagerType(): typeof BaseManager {
    return OracleManager;
  }

  getAssignmentScreen(_player: PlayerInstance): StartGameScreenData {
    return {
      title: "Oracle",
      subtitle: "Enchant a player",
      color: [255, 140, 238, 255],
    };
  }
}
