import { StartGameScreenData } from "@polusgg/plugin-polusgg-api/src/services/roleManager/roleManagerService";
import { BaseManager } from "@polusgg/plugin-polusgg-api/src/baseManager/baseManager";
import { RoleAlignment, RoleMetadata } from "@polusgg/plugin-polusgg-api/src/baseRole/baseRole";
import { ServiceType } from "@polusgg/plugin-polusgg-api/src/types/enums";
import { PlayerInstance } from "@nodepolus/framework/src/api/player";
import { AssetBundle } from "@polusgg/plugin-polusgg-api/src/assets";
import { BaseRole } from "@polusgg/plugin-polusgg-api/src/baseRole";
import { Services } from "@polusgg/plugin-polusgg-api/src/services";
import { TextComponent } from "@nodepolus/framework/src/api/text";
import { EdgeAlignments } from "@polusgg/plugin-polusgg-api/src/types/enums/edgeAlignment";
import { Vector2 } from "@nodepolus/framework/src/types";

class PlayerAppearance {
  constructor(
    public name: TextComponent,
    public hat: number,
    public pet: number,
    public skin: number,
    public color: number,
  ) {}

  static save(player: PlayerInstance): PlayerAppearance {
    return new PlayerAppearance(
      player.getName(),
      player.getColor(),
      player.getPet(),
      player.getSkin(),
      player.getColor(),
    );
  }

  apply(player: PlayerInstance): void {
    player.setName(this.name);
    player.setHat(this.hat);
    player.setPet(this.pet);
    player.setSkin(this.skin);
    player.setColor(this.color);
  }
}

export class ChameleonManager extends BaseManager {
  getId(): string { return "chameleon" }
  getTypeName(): string { return "Chameleon" }
}

export class Chameleon extends BaseRole {
  protected metadata: RoleMetadata = {
    name: "Chameleon",
    alignment: RoleAlignment.Impostor,
  };

  constructor(owner: PlayerInstance) {
    super(owner);

    if (owner.getConnection() !== undefined) {
      Services.get(ServiceType.Resource).load(owner.getConnection()!, AssetBundle.loadSafeFromCache("TownOfPolus")).then(this.onReady);
    } else {
      this.onReady();
    }
  }

  onReady(): void {
    Services.get(ServiceType.Button).spawnButton(this.owner.getSafeConnection(), {
      asset: AssetBundle.loadSafeFromCache("TownOfPolus").getSafeAsset("Assets/Mods/TownOfPolus/Chameleon.png"),
      maxTimer: this.owner.getLobby().getOptions().getKillCooldown(),
      position: new Vector2(2.7, 0.7),
      alignment: EdgeAlignments.RightBottom,
    }).then(button => {
      this.catch("player.died", event => event.getPlayer()).execute(_ => button.getEntity().despawn());
      button.on("clicked", () => {
        const playerAppearances = new Map<PlayerInstance, PlayerAppearance>();

        const blendAppearance = new PlayerAppearance(
          new TextComponent(),
          0,
          0,
          0,
          0,
        );

        this.owner.getLobby().getPlayers().forEach(player => {
          playerAppearances.set(player, PlayerAppearance.save(player));
        });

        this.owner.getLobby().getPlayers().forEach(player => {
          blendAppearance.apply(player);
        });

        setTimeout(() => {
          this.owner.getLobby().getPlayers().forEach(player => {
            const playerAppearance = playerAppearances.get(player);

            if (playerAppearance === undefined) {
              return;
            }

            const appearance = new PlayerAppearance(
              playerAppearance.name,
              playerAppearance.hat,
              playerAppearance.pet,
              playerAppearance.skin,
              playerAppearance.color,
            );

            appearance.apply(player);
          });
        }, 5000);
      });
    });
  }

  getManagerType(): typeof BaseManager {
    return ChameleonManager;
  }

  getAssignmentScreen(player: PlayerInstance): StartGameScreenData {
    const impostors = player.getLobby().getPlayers().filter(x => x.isImpostor()).length;
    const impostorText = impostors > 1 ? "Impostors" : "Impostor";
    const identityText = impostors > 1 ? "identities" : "identity";

    return {
      title: "Chameleon",
      subtitle: `Help the ${impostorText} win by covering up their ${identityText}.`,
      color: [121, 194, 90, 255],
    };
  }
}

//Author: Kadez - http://twitter.kadez.me
