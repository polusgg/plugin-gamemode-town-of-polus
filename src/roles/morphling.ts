import { PlayerInstance } from "@nodepolus/framework/src/api/player";
import { TextComponent } from "@nodepolus/framework/src/api/text";
import { AssetBundle } from "@nodepolus/framework/src/protocol/polus/assets";
import { Button } from "@nodepolus/framework/src/protocol/polus/entityWrappers";
import { Palette } from "@nodepolus/framework/src/static";
import { Mutable, Vector2 } from "@nodepolus/framework/src/types";
import { EdgeAlignments, GameState, PlayerColor } from "@nodepolus/framework/src/types/enums";
import { BaseManager } from "@polusgg/plugin-polusgg-api/src/baseManager/baseManager";
import { RoleAlignment, RoleMetadata } from "@polusgg/plugin-polusgg-api/src/baseRole/baseRole";
import { Impostor } from "@polusgg/plugin-polusgg-api/src/baseRole/impostor/impostor";
import { Services } from "@polusgg/plugin-polusgg-api/src/services";
import { PlayerAnimationKeyframe } from "@nodepolus/framework/src/protocol/polus/animation/player";
import { StartGameScreenData } from "@polusgg/plugin-polusgg-api/src/services/roleManager/roleManagerService";
import { ServiceType } from "@polusgg/plugin-polusgg-api/src/types/enums";
import { PlayerAnimationField } from "@polusgg/plugin-polusgg-api/src/types/playerAnimationFields";
import { TownOfPolusGameOptions } from "../..";
import { TownOfPolusGameOptionNames } from "../types";

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
    // player.setColor(this.color);
  }
}

export class Morphling extends Impostor {
  public targetAppearance?: PlayerAppearance;
  public ownAppearance?: PlayerAppearance;
  public timeout?: NodeJS.Timeout;
  public transformed: boolean;
  public morphButton: Button | undefined;

  protected metadata: RoleMetadata = {
    name: "Morphling",
    alignment: RoleAlignment.Impostor,
  };

  constructor(owner: PlayerInstance) {
    super(owner);
    this.transformed = false;

    if (owner.getConnection() !== undefined) {
      owner.getConnection()!.loadBundle(AssetBundle.loadSafeFromCache("TownOfPolus")).then(this.onReady.bind(this));
    } else {
      this.onReady();
    }
  }

  async onReady(): Promise<void> {
    const gameOptions = Services.get(ServiceType.GameOptions).getGameOptions<TownOfPolusGameOptions>(this.owner.getLobby());

    this.ownAppearance = PlayerAppearance.save(this.owner);

    this.morphButton = await this.owner.getLobby().spawnButton(this.owner.getSafeConnection(), {
      asset: AssetBundle.loadSafeFromCache("TownOfPolus").getSafeAsset("Assets/Mods/TownOfPolus/Sample.png"),
      maxTimer: gameOptions.getOption(TownOfPolusGameOptionNames.GrenadierCooldown).getValue().value,
      position: new Vector2(2.1, 2.1),
      alignment: EdgeAlignments.RightBottom,
    });

    this.catch("player.died", event => event.getPlayer()).execute(_ => {
      if (this.morphButton === undefined) {
        return;
      }

      this.morphButton.getEntity().despawn();
      this.morphButton = undefined;
    });

    this.catch("meeting.ended", event => event.getGame())
      .execute(() => {
        if (this.morphButton) {
          this.morphButton.setCurrentTime(this.morphButton.getMaxTime());
        }
      });

    Services.get(ServiceType.CoroutineManager)
      .beginCoroutine(this.owner, this.coSaturateMorphlingButton(this.owner, this.morphButton));

    this.morphButton.on("clicked", async () => {
      if (this.morphButton === undefined || this.morphButton.getCurrentTime() !== 0 || this.transformed) {
        return;
      }

      if (this.targetAppearance === undefined) {
        const target = this.morphButton.getTarget(this.owner.getLobby().getOptions().getKillDistance() + 1);

        if (target !== undefined) {
          await Promise.allSettled(
            [
              this.morphButton.setColor([162, 18, 219, 0x7F]),
              this.morphButton.setAsset(AssetBundle.loadSafeFromCache("TownOfPolus").getSafeAsset("Assets/Mods/TownOfPolus/Morph.png")),
              this.morphButton.setCurrentTime(5),
            ],
          );
          this.targetAppearance = PlayerAppearance.save(target);
        }
      } else {
        await this.morphButton.reset(true);
        this.transformed = true;
        await await Services.get(ServiceType.Animation).beginPlayerAnimation(this.owner, [PlayerAnimationField.HatOpacity, PlayerAnimationField.PetOpacity, PlayerAnimationField.SkinOpacity, PlayerAnimationField.PrimaryColor, PlayerAnimationField.SecondaryColor], [
          new PlayerAnimationKeyframe({
            offset: 0,
            duration: 100,
            hatOpacity: 0,
            petOpacity: 0,
            skinOpacity: 0,
            primaryColor: [255, 255, 255, 255],
            secondaryColor: [255, 255, 255, 255],
          }),
        ], false);

        if (this.owner.getLobby().getMeetingHud() !== undefined) {
          return;
        }

        this.targetAppearance.apply(this.owner);
        await await Services.get(ServiceType.Animation).beginPlayerAnimation(this.owner, [PlayerAnimationField.HatOpacity, PlayerAnimationField.PetOpacity, PlayerAnimationField.SkinOpacity, PlayerAnimationField.PrimaryColor, PlayerAnimationField.SecondaryColor], [
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
          await await Services.get(ServiceType.Animation).beginPlayerAnimation(this.owner, [PlayerAnimationField.HatOpacity, PlayerAnimationField.PetOpacity, PlayerAnimationField.SkinOpacity, PlayerAnimationField.PrimaryColor, PlayerAnimationField.SecondaryColor], [
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
          await await Services.get(ServiceType.Animation).beginPlayerAnimation(this.owner, [PlayerAnimationField.HatOpacity, PlayerAnimationField.PetOpacity, PlayerAnimationField.SkinOpacity, PlayerAnimationField.PrimaryColor, PlayerAnimationField.SecondaryColor], [
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
        }, 5000);
      }
    });

    this.catch("meeting.started", event => event.getGame())
      .where(() => !this.owner.isDead())
      .execute(() => {
        this.ownAppearance?.apply(this.owner);
        this.targetAppearance = undefined;
        // this.morphButton?.setColor([162, 18, 219, 0x7F]);
        this.morphButton?.setAsset(AssetBundle.loadSafeFromCache("TownOfPolus").getSafeAsset("Assets/Mods/TownOfPolus/Sample.png"));
        this.morphButton?.setCurrentTime(5);
      });
  }

  * coSaturateMorphlingButton(player: PlayerInstance, button: Button): Generator<void, void, number> {
    if (player.getLobby().getGameState() !== GameState.Started) {
      yield;
    }

    while (true) {
      if (player.isDead()) {
        console.log("saturation broke out");
        break;
      }

      if (this.targetAppearance !== undefined) {
        yield;
        continue;
      }

      const target = button.getTarget(this.owner.getLobby().getOptions().getKillDistance() + 1);

      const isSaturated = button.isSaturated();

      if ((target === undefined) === isSaturated) {
        console.log("saturation updated", !isSaturated);
        button.setSaturated(!isSaturated);
      }
      yield;
    }
  }

  getManagerType(): typeof BaseManager {
    return MorphlingManager;
  }

  getAssignmentScreen(_player: PlayerInstance): StartGameScreenData {
    return {
      title: "Morphling",
      subtitle: "Transform and deceive the <color=#8CFFFFFF>crewmates</color>",
      color: [162, 18, 219, 255],
    };
  }
}
