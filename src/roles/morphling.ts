import { PlayerAnimationKeyframe } from "@polusgg/plugin-polusgg-api/src/services/animation/keyframes/player";
import { StartGameScreenData } from "@polusgg/plugin-polusgg-api/src/services/roleManager/roleManagerService";
import { EdgeAlignments } from "@polusgg/plugin-polusgg-api/src/types/enums/edgeAlignment";
import { BaseManager } from "@polusgg/plugin-polusgg-api/src/baseManager/baseManager";
import { RoleAlignment, RoleMetadata } from "@polusgg/plugin-polusgg-api/src/baseRole/baseRole";
import { ServiceType } from "@polusgg/plugin-polusgg-api/src/types/enums";
import { AssetBundle } from "@polusgg/plugin-polusgg-api/src/assets";
import { PlayerInstance } from "@nodepolus/framework/src/api/player";
import { Services } from "@polusgg/plugin-polusgg-api/src/services";
import { TextComponent } from "@nodepolus/framework/src/api/text";
import { PlayerColor, PlayerRole } from "@nodepolus/framework/src/types/enums";
import { Mutable, Vector2 } from "@nodepolus/framework/src/types";
import { Player } from "@nodepolus/framework/src/player";
import { TownOfPolusGameOptions } from "../..";
import { Palette } from "@nodepolus/framework/src/static";
import { TownOfPolusGameOptionNames } from "../types";
import { Impostor } from "@polusgg/plugin-polusgg-api/src/baseRole/impostor/impostor";

export class MorphlingManager extends BaseManager {
  getId(): string { return "morphling" }
  getTypeName(): string { return "Morphling" }
}

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
      player.getHat(),
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

export class Morphling extends Impostor {
  public targetAppearance?: PlayerAppearance;
  public ownAppearance?: PlayerAppearance;
  public timeout?: NodeJS.Timeout;
  public transformed: boolean;

  protected metadata: RoleMetadata = {
    name: "Morphling",
    alignment: RoleAlignment.Impostor,
  };

  constructor(owner: PlayerInstance) {
    super(owner);
    this.transformed = false;

    if (owner.getConnection() !== undefined) {
      Services.get(ServiceType.Resource).load(owner.getConnection()!, AssetBundle.loadSafeFromCache("TownOfPolus")).then(this.onReadyImpostor.bind(this));
    } else {
      this.onReadyImpostor();
    }
  }

  onReady(): void {
    const gameOptions = Services.get(ServiceType.GameOptions).getGameOptions<TownOfPolusGameOptions>(this.owner.getLobby());

    Services.get(ServiceType.RoleManager).setBaseRole(this.owner as Player, PlayerRole.Impostor);
    this.ownAppearance = PlayerAppearance.save(this.owner);

    Services.get(ServiceType.Button).spawnButton(this.owner.getSafeConnection(), {
      asset: AssetBundle.loadSafeFromCache("TownOfPolus").getSafeAsset("Assets/Mods/TownOfPolus/Sample.png"),
      maxTimer: gameOptions.getOption(TownOfPolusGameOptionNames.GrenadierCooldown).getValue().value,
      position: new Vector2(2.1, 2.1),
      alignment: EdgeAlignments.RightBottom,
    }).then(button => {
      button.on("clicked", async () => {
        if (button.getCurrentTime() != 0 && !this.transformed) {
          return;
        }

        if (this.targetAppearance === undefined) {
          const target = button.getTarget(3);

          if (target !== undefined) {
            button.setColor([162, 18, 219, 0x7F]);
            button.setAsset(AssetBundle.loadSafeFromCache("TownOfPolus").getSafeAsset("Assets/Mods/TownOfPolus/Morph.png"));
            button.setCurrentTime(5);
            this.targetAppearance = PlayerAppearance.save(target);
          }
        } else {
          button.reset(true);
          this.transformed = true;
          button.setSaturated(false);
          await await Services.get(ServiceType.Animation).beginPlayerAnimation(this.owner, {
            hatOpacity: true,
            petOpacity: true,
            skinOpacity: true,
            primaryColor: true,
            secondaryColor: true,
          }, [
            new PlayerAnimationKeyframe({
              offset: 0,
              duration: 100,
              hatOpacity: 1,
              petOpacity: 1,
              skinOpacity: 1,
              primaryColor: [255, 255, 255, 255],
              secondaryColor: [255, 255, 255, 255],
            }),
          ], false);

          if (this.owner.getLobby().getMeetingHud() !== undefined) {
            return;
          }

          this.targetAppearance.apply(this.owner);
          await await Services.get(ServiceType.Animation).beginPlayerAnimation(this.owner, {
            hatOpacity: true,
            petOpacity: true,
            skinOpacity: true,
            primaryColor: true,
            secondaryColor: true,
          }, [
            new PlayerAnimationKeyframe({
              offset: 0,
              duration: 100,
              hatOpacity: 1,
              petOpacity: 1,
              skinOpacity: 1,
              primaryColor: Palette.playerBody()[this.ownAppearance!.color as PlayerColor].dark as Mutable<[number, number, number, number]>,
              secondaryColor: Palette.playerBody()[this.ownAppearance!.color as PlayerColor].light as Mutable<[number, number, number, number]>,
            }),
          ], false);

          this.timeout = setTimeout(async () => {
            await await Services.get(ServiceType.Animation).beginPlayerAnimation(this.owner, {
              hatOpacity: true,
              petOpacity: true,
              skinOpacity: true,
              primaryColor: true,
              secondaryColor: true,
            }, [
              new PlayerAnimationKeyframe({
                angle: 0,
                duration: 100,
                offset: 0,
                opacity: 0,
                position: Vector2.zero(),
                scale: Vector2.one(),
                primaryColor: [255, 255, 255, 255],
                secondaryColor: [255, 255, 255, 255],
              }),
            ], false);
            this.ownAppearance!.apply(this.owner);
            await await Services.get(ServiceType.Animation).beginPlayerAnimation(this.owner, {
              hatOpacity: true,
              petOpacity: true,
              skinOpacity: true,
              primaryColor: true,
              secondaryColor: true,
            }, [
              new PlayerAnimationKeyframe({
                angle: 0,
                duration: 100,
                offset: 0,
                opacity: 1,
                position: Vector2.zero(),
                scale: Vector2.one(),
                primaryColor: Palette.playerBody()[this.targetAppearance!.color as PlayerColor].dark as Mutable<[number, number, number, number]>,
                secondaryColor: Palette.playerBody()[this.targetAppearance!.color as PlayerColor].light as Mutable<[number, number, number, number]>,
              }),
            ], false);
            this.transformed = false;
            button.setSaturated(true);
          }, 5000);
        }
      });
    });

    this.catch("meeting.started", event => event.getGame()).execute(() => {
      this.ownAppearance?.apply(this.owner);
    });
  }

  getManagerType(): typeof BaseManager {
    return MorphlingManager;
  }

  getAssignmentScreen(_player: PlayerInstance): StartGameScreenData {
    return {
      title: "Morphling",
      subtitle: "Transform and deceive the crew",
      color: [162, 18, 219, 255],
    };
  }
}
